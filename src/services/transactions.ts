import { BankTransaction } from 'xero-node';
import { query } from '../utils/db.js';
import { XeroService } from './xero.js';
import { v4 as uuidv4 } from 'uuid';

export class TransactionService {
  static async syncTransactions(tenantId: string) {
    const xero = await XeroService.getClient(tenantId);
    const connection = query(
      `SELECT last_sync_at FROM xero_connections WHERE tenant_id = '${tenantId}'`,
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
        `UPDATE xero_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE tenant_id = '${tenantId}'`,
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
      `SELECT id FROM transactions WHERE xero_transaction_id = '${xeroId}'`,
    );

    if (existing && existing.length > 0) {
      query(`UPDATE transactions SET 
        date = '${date}',
        amount = ${amount},
        currency = '${currency}',
        description = '${description.replace(/'/g, "''")}',
        status = '${status}',
        updated_at = CURRENT_TIMESTAMP
        WHERE xero_transaction_id = '${xeroId}'`);
    } else {
      const id = uuidv4();
      query(`INSERT INTO transactions (id, xero_transaction_id, date, amount, currency, description, status) 
        VALUES ('${id}', '${xeroId}', '${date}', ${amount}, '${currency}', '${description.replace(/'/g, "''")}', '${status}')`);
    }
  }

  static async reconcile(_tenantId: string) {
    // Implement matching logic from reconciliation_workflow.md
  }

  static async mapToGAAP(_transactionId: string) {
    // Implement mapping logic from gaap_mapping_rules.md
  }
}
