import { TransactionService } from './services/transactions.js';
import { XeroService } from './services/xero.js';
import { query } from './utils/db.js';
import { v4 as uuidv4 } from 'uuid';

// --- Mocking Infrastructure ---

let mockInvoices: any[] = [];

const mockXero = {
  accountingApi: {
    getInvoices: async (tenantId: string, ifModifiedSince?: Date, where?: string) => {
      console.log(`[Mock Xero] getInvoices called with where: "${where}"`);
      
      // Basic parser for the 'where' clause used in TransactionsService
      let filtered = mockInvoices;
      
      if (where) {
        if (where.includes('AmountDue ==')) {
          const match = where.match(/AmountDue == ([\d.]+)/);
          if (match) {
            const amount = parseFloat(match[1]);
            filtered = filtered.filter(inv => inv.amountDue === amount);
          }
        } else if (where.includes('AmountDue >') && where.includes('AmountDue <=')) {
           const match = where.match(/AmountDue > ([\d.]+) AND AmountDue <= ([\d.]+)/);
           if (match) {
             const min = parseFloat(match[1]);
             const max = parseFloat(match[2]);
             filtered = filtered.filter(inv => inv.amountDue > min && inv.amountDue <= max);
           }
        } else if (where.includes('AmountDue > 0')) {
           filtered = filtered.filter(inv => inv.amountDue > 0);
        }
      }
      
      return { body: { invoices: filtered } };
    }
  }
};

// Monkey-patch XeroService.getClient
(XeroService as any).getClient = async () => mockXero;

// --- Test Runner ---

interface TestScenario {
  id: string;
  name: string;
  bankTx: {
    date: string;
    amount: number;
    description: string;
  };
  xeroInvoices: any[];
  expectedOutcome: {
    status: string;
    ruleId?: string;
  };
}

const scenarios: TestScenario[] = [
  {
    id: '1.1',
    name: 'Exact Invoice Match',
    bankTx: { date: '2026-06-01', amount: 1200.00, description: 'INV-1001' },
    xeroInvoices: [
      { invoiceID: 'inv-1', invoiceNumber: 'INV-1001', amountDue: 1200.00, date: '2026-05-25', status: 'AUTHORISED' }
    ],
    expectedOutcome: { status: 'reconciled', ruleId: 'RULE-1.1-EXACT-INV' }
  },
  {
    id: '1.2',
    name: 'Fuzzy Name & Close Date Match',
    bankTx: { date: '2026-06-03', amount: 15.50, description: 'Starbucks Coffee' },
    xeroInvoices: [
      { invoiceID: 'inv-2', invoiceNumber: 'INV-1002', contact: { name: 'Starbucks' }, amountDue: 15.50, date: '2026-06-01', status: 'AUTHORISED' }
    ],
    expectedOutcome: { status: 'reconciled', ruleId: 'RULE-2.1-CLOSE-DATE-INV' }
  },
  {
    id: '1.3',
    name: 'Merchant Fee Adjustment',
    bankTx: { date: '2026-06-07', amount: 970.00, description: 'Stripe Payout' },
    xeroInvoices: [
      { invoiceID: 'inv-3', invoiceNumber: 'INV-1004', amountDue: 1000.00, date: '2026-06-05', status: 'AUTHORISED' }
    ],
    expectedOutcome: { status: 'reconciled', ruleId: 'RULE-1.3-MERCHANT-FEE' }
  },
  {
    id: '2.1',
    name: 'Multi-Transaction (One-to-Many)',
    bankTx: { date: '2026-06-05', amount: 3000.00, description: 'Bulk Deposit' },
    xeroInvoices: [
      { invoiceID: 'inv-4', invoiceNumber: 'INV-1002', amountDue: 1000.00, date: '2026-06-03', status: 'AUTHORISED' },
      { invoiceID: 'inv-5', invoiceNumber: 'INV-1003', amountDue: 2000.00, date: '2026-06-03', status: 'AUTHORISED' }
    ],
    expectedOutcome: { status: 'needs_review', ruleId: 'RULE-3.0-MULTI-MATCH' }
  },
  {
    id: '3.1',
    name: 'Ambiguous Duplicate Amounts',
    bankTx: { date: '2026-06-12', amount: 5000.00, description: 'Check 501' },
    xeroInvoices: [
      { invoiceID: 'inv-6', invoiceNumber: 'INV-1006', amountDue: 5000.00, date: '2026-06-10', status: 'AUTHORISED' },
      { invoiceID: 'inv-7', invoiceNumber: 'INV-1007', amountDue: 5000.00, date: '2026-06-11', status: 'AUTHORISED' }
    ],
    expectedOutcome: { status: 'needs_review', ruleId: 'RULE-3.1-AMBIGUOUS-MATCH' }
  },
  // Scenarios that are expected to fail if not implemented
  {
    id: '4.1',
    name: 'Fixed Asset Capitalization',
    bankTx: { date: '2026-06-22', amount: 3200.00, description: 'Apple Store' },
    xeroInvoices: [],
    expectedOutcome: { status: 'needs_review', ruleId: 'RULE-4.1-CAPITALIZATION' }
  }
];

async function runTests() {
  console.log('--- Starting Integration Test Runner ---');
  let passedCount = 0;
  let failedCount = 0;

  for (const scenario of scenarios) {
    console.log(`\nTesting Case ${scenario.id}: ${scenario.name}`);
    
    // 1. Cleanup
    query(`DELETE FROM bank_reconciliation_logs`);
    query(`DELETE FROM transactions`);
    
    // 2. Setup DB
    const txId = uuidv4();
    query(`INSERT INTO transactions (id, xero_transaction_id, date, amount, currency, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      [txId, `mock-xero-${scenario.id}`, scenario.bankTx.date, scenario.bankTx.amount, 'USD', scenario.bankTx.description, 'pending']
    );
    
    // 3. Setup Xero Mock
    mockInvoices = scenario.xeroInvoices;
    
    // 4. Run Reconcile
    try {
      const results = await TransactionService.reconcile('test-tenant');
      
      // 5. Validate
      const tx = query(`SELECT status FROM transactions WHERE id = ?`, [txId])[0];
      const log = query(`SELECT rule_id FROM bank_reconciliation_logs WHERE transaction_id = ?`, [txId])[0];
      
      const actualStatus = tx?.status;
      const actualRuleId = log?.rule_id;
      
      const statusPass = actualStatus === scenario.expectedOutcome.status;
      const rulePass = !scenario.expectedOutcome.ruleId || actualRuleId === scenario.expectedOutcome.ruleId;
      
      if (statusPass && rulePass) {
        console.log(`✅ PASS`);
        passedCount++;
      } else {
        console.log(`❌ FAIL`);
        console.log(`   Expected: Status=${scenario.expectedOutcome.status}, Rule=${scenario.expectedOutcome.ruleId}`);
        console.log(`   Actual:   Status=${actualStatus}, Rule=${actualRuleId}`);
        failedCount++;
      }
    } catch (error: any) {
      console.log(`❌ ERROR: ${error.message}`);
      failedCount++;
    }
  }

  console.log('\n--- Test Summary ---');
  console.log(`Total: ${scenarios.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
