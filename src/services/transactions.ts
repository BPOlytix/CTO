import { BankTransaction, Invoice } from 'xero-node';
import { query } from '../utils/db.js';
import { XeroService } from './xero.js';
import { v4 as uuidv4 } from 'uuid';
import { ReconciliationEngine } from './reconciliation-engine.js';
import type { ReconciliationMatch } from './reconciliation-engine.js';

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

    const results: ReconciliationMatch[] = [];

    for (const tx of pendingTransactions) {
      const match = await this.findMatch(tx, tenantId, xero);
      if (match) {
        const result: ReconciliationMatch & { transactionId: string } = {
          ...match,
          transactionId: tx.id,
        };
        results.push(result);
        await this.applyReconciliationResult(result);
      }
    }

    return results;
  }

  private static async findMatch(
    tx: any,
    tenantId: string,
    xero: any,
  ): Promise<ReconciliationMatch | null> {
    const amount = Math.abs(tx.amount);
    const txDate = new Date(tx.date);
    
    // Fetch candidate invoices and bills from Xero
    const response = await xero.accountingApi.getInvoices(
      tenantId,
      undefined,
      'Status == "AUTHORISED"',
    );

    const candidates: Invoice[] = response.body.invoices || [];

    return ReconciliationEngine.findBestMatch(
      { amount, date: txDate, description: tx.description || '' },
      candidates
    );
  }

  private static async applyReconciliationResult(result: ReconciliationMatch & { transactionId: string }) {
    const { transactionId, ruleId, confidenceScore, reasoning, matchMetadata, adjustmentType, adjustmentAmount } = result;
    const status = result.requiresReview ? 'needs_review' : 'reconciled';

    // 1. Log the action
    const logId = uuidv4();
    const metadata = {
      ...matchMetadata,
      reasoning,
      adjustmentType,
      adjustmentAmount,
      agent_id: 'accrue-ai-v1.0.0',
    };

    query(`INSERT INTO bank_reconciliation_logs (id, transaction_id, rule_id, confidence_score, supporting_docs)
      VALUES (?, ?, ?, ?, ?)`,
      [logId, transactionId, ruleId, confidenceScore, metadata]);

    // 2. Update transaction status
    query(`UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, transactionId]);
    
    console.log(`Reconciled transaction ${transactionId} via ${ruleId} (Status: ${status})`);
  }

  static async mapToGAAP(_transactionId: string) {
    // Implement mapping logic from gaap_mapping_rules.md
  }
}
