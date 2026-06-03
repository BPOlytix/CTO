import { BankTransaction, Invoice, Invoices } from 'xero-node';
import { query } from '../utils/db.js';
import { XeroService } from './xero.js';
import { v4 as uuidv4 } from 'uuid';

interface ReconciliationResult {
  transactionId: string;
  ruleId: string;
  confidenceScore: number;
  matchMetadata?: any;
  reasoning: string;
  adjustmentType?: string;
  adjustmentAmount?: number;
  requiresReview: boolean;
}

export class TransactionService {
  static async syncTransactions(tenantId: string) {
    const xero = await XeroService.getClient(tenantId);
    const connection = query(
      'SELECT last_sync_at FROM xero_connections WHERE tenant_id = ?',
      [tenantId]
    );
    const lastSync = connection[0]?.last_sync_at;

    console.log(
      `Syncing transactions for tenant: ${tenantId}, since: ${lastSync || 'beginning'}`,
    );

    let page = 1;
    let totalSynced = 0;

    try {
      while (true) {
        const response = await xero.accountingApi.getBankTransactions(
          tenantId,
          lastSync ? new Date(lastSync) : undefined,
          undefined, // where
          undefined, // order
          page,
        );
        const bankTransactions = response.body.bankTransactions || [];

        for (const tx of bankTransactions) {
          await this.saveXeroTransaction(tx);
        }

        totalSynced += bankTransactions.length;
        console.log(
          `Synced page ${page}, found ${bankTransactions.length} transactions`,
        );

        if (bankTransactions.length < 100) break;
        page++;
      }

      query(
        'UPDATE xero_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE tenant_id = ?',
        [tenantId]
      );
      return totalSynced;
    } catch (error: any) {
      console.error(
        'Error syncing transactions:',
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  private static async saveXeroTransaction(tx: BankTransaction) {
    const xeroId = tx.bankTransactionID;
    const date = tx.date;
    const amount = tx.total;
    const currency = tx.currencyCode;
    const description = (tx.reference || tx.type || '').toString();
    const status =
      (tx.status as unknown as string) === 'DELETED' ? 'deleted' : 'pending';

    const existing = query(
      'SELECT id FROM transactions WHERE xero_transaction_id = ?',
      [xeroId]
    );

    if (existing && existing.length > 0) {
      query(
        `UPDATE transactions SET 
        date = ?,
        amount = ?,
        currency = ?,
        description = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE xero_transaction_id = ?`,
        [date, amount, currency, description, status, xeroId]
      );
    } else {
      const id = uuidv4();
      query(
        `INSERT INTO transactions (id, xero_transaction_id, date, amount, currency, description, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, xeroId, date, amount, currency, description, status]
      );
    }
  }

  static async reconcile(tenantId: string) {
    const xero = await XeroService.getClient(tenantId);

    // 1. Fetch pending transactions from DB
    const pendingTransactions = query(
      `SELECT * FROM transactions WHERE status = 'pending' ORDER BY date ASC`,
    );

    console.log(
      `Reconciling ${pendingTransactions.length} transactions for tenant: ${tenantId}`,
    );

    const results: ReconciliationResult[] = [];

    for (const tx of pendingTransactions) {
      const match = await this.findMatch(tx, tenantId, xero);
      if (match) {
        results.push(match);
        await this.applyReconciliationResult(match);
      }
    }

    return results;
  }

  private static async findMatch(
    tx: any,
    tenantId: string,
    xero: any,
  ): Promise<ReconciliationResult | null> {
    const amount = tx.amount;
    const txDate = new Date(tx.date);
    const description = tx.description || '';

    // Fetch candidate invoices/bills from Xero
    const invoicesResponse = await xero.accountingApi.getInvoices(
      tenantId,
      undefined, // ifModifiedSince
      `AmountDue == ${amount} AND Status == "AUTHORISED"`,
    );

    const candidates: Invoice[] = invoicesResponse.body.invoices || [];

    // Rule 1: Exact Match (Reference or Invoice Number)
    for (const inv of candidates) {
      const isExactRef =
        (inv.invoiceNumber && inv.invoiceNumber === description) || 
        (inv.reference && inv.reference === description);

      if (isExactRef) {
        return {
          transactionId: tx.id,
          ruleId: 'RULE-1.1-EXACT-INV',
          confidenceScore: 0.99,
          matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
          reasoning: 'Exact reference/invoice number match.',
          requiresReview: false,
        };
      }
    }

    // Rule 2: Close Date Match
    for (const inv of candidates) {
      const invDate = new Date(inv.date!);
      const diffDays = Math.abs(
        (invDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays <= 3) {
        const contactName = inv.contact?.name?.toLowerCase();
        const isFuzzyPayee = contactName && (
          description.toLowerCase().includes(contactName) ||
          contactName.includes(description.toLowerCase())
        );

        if (isFuzzyPayee) {
          return {
            transactionId: tx.id,
            ruleId: 'RULE-2.1-CLOSE-DATE-INV',
            confidenceScore: 0.92,
            matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
            reasoning: 'Exact amount, date within 3 days, and fuzzy payee match.',
            requiresReview: false,
          };
        }
      }
    }

    // Case 3.1: Ambiguous Duplicate Amounts
    if (candidates.length > 1) {
      return {
        transactionId: tx.id,
        ruleId: 'RULE-3.1-AMBIGUOUS-MATCH',
        confidenceScore: 0.60,
        matchMetadata: { candidateIds: candidates.map((c) => c.invoiceID) },
        reasoning:
          'Multiple invoices found with the same amount but no clear reference/payee match.',
        requiresReview: true,
      };
    }

    // Rule 1.3: Merchant Fees
    const feeThreshold = amount * 0.05;
    const feeInvoicesResponse = await xero.accountingApi.getInvoices(
      tenantId,
      undefined,
      `AmountDue > ${amount} AND AmountDue <= ${amount + feeThreshold} AND Status == "AUTHORISED"`,
    );

    const feeCandidates: Invoice[] = feeInvoicesResponse.body.invoices || [];
    for (const inv of feeCandidates) {
      const fee = inv.amountDue! - amount;
      const isMerchant = description.toLowerCase().includes('stripe') || 
                         description.toLowerCase().includes('paypal') ||
                         description.toLowerCase().includes('payout');
      
      if (isMerchant) {
        return {
          transactionId: tx.id,
          ruleId: 'RULE-1.3-MERCHANT-FEE',
          confidenceScore: 0.96,
          matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
          reasoning: 'Merchant payout match with automatic fee adjustment.',
          adjustmentType: 'bank_fee',
          adjustmentAmount: fee,
          requiresReview: false,
        };
      }
    }

    // Rule 3.0: Multi-Transaction Match (One-to-Many)
    const multiInvoicesResponse = await xero.accountingApi.getInvoices(
      tenantId,
      undefined,
      `AmountDue > 0 AND AmountDue < ${amount} AND Status == "AUTHORISED"`,
    );

    const multiCandidates: Invoice[] = multiInvoicesResponse.body.invoices || [];
    for (let i = 0; i < multiCandidates.length; i++) {
      for (let j = i + 1; j < multiCandidates.length; j++) {
        const inv1 = multiCandidates[i];
        const inv2 = multiCandidates[j];
        if (Math.abs((inv1.amountDue! + inv2.amountDue!) - amount) < 0.01) {
          return {
            transactionId: tx.id,
            ruleId: 'RULE-3.0-MULTI-MATCH',
            confidenceScore: 0.88,
            matchMetadata: { 
              invoiceIds: [inv1.invoiceID, inv2.invoiceID],
              invoiceNumbers: [inv1.invoiceNumber, inv2.invoiceNumber]
            },
            reasoning: 'Transaction amount matches sum of multiple invoices.',
            requiresReview: true,
          };
        }
      }
    }

    // Rule 4.1: Fixed Asset Capitalization (Fallback if no match found)
    if (amount >= 2500) {
      return {
        transactionId: tx.id,
        ruleId: 'RULE-4.1-CAPITALIZATION',
        confidenceScore: 0.70,
        reasoning: `Transaction amount (${amount}) exceeds the $2,500 capitalization threshold. Requires Fixed Asset review.`,
        requiresReview: true,
      };
    }

    return null;
  }

  private static async applyReconciliationResult(result: ReconciliationResult) {
    const { transactionId, ruleId, confidenceScore, reasoning, matchMetadata, adjustmentType, adjustmentAmount } = result;
    const status = result.requiresReview ? 'needs_review' : 'reconciled';

    // 1. Log the action
    const logId = uuidv4();
    const metadata = JSON.stringify({
      ...matchMetadata,
      reasoning,
      adjustmentType,
      adjustmentAmount,
      agent_id: 'accrue-ai-v1.0.0',
    });

    query(
      `INSERT INTO bank_reconciliation_logs (id, transaction_id, rule_id, confidence_score, supporting_docs)
      VALUES (?, ?, ?, ?, ?)`,
      [logId, transactionId, ruleId, confidenceScore, metadata]
    );

    // 2. Update transaction status
    query(
      `UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, transactionId]
    );
    
    console.log(`Reconciled transaction ${transactionId} via ${ruleId} (Status: ${status})`);
  }

  static async mapToGAAP(_transactionId: string) {
    // Implement mapping logic from gaap_mapping_rules.md
  }
}
