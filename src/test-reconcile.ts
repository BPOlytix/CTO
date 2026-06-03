import { TransactionService } from './services/transactions.js';
import { query } from './utils/db.js';
import { v4 as uuidv4 } from 'uuid';

async function test() {
  const tenantId = 'test-tenant-id';
  
  // Insert a mock transaction
  const txId = uuidv4();
  query(`INSERT INTO transactions (id, xero_transaction_id, date, amount, currency, description, status)
    VALUES ('${txId}', 'xero-tx-1', '2026-06-01', 1200.00, 'USD', 'INV-1001', 'pending')`);

  console.log('Inserted mock transaction');

  // Mock Xero call (This will fail in reality without real credentials, but we can see if the logic flows)
  try {
    const results = await TransactionService.reconcile(tenantId);
    console.log('Reconciliation results:', results);
  } catch (error: any) {
    console.log('Expected error or result:', error.message);
  }
}

test();
