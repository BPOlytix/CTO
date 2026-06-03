import { TransactionService } from './services/transactions.js';
import { query } from './utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

async function runValidation() {
  console.log('Starting Reconciliation Engine Validation Suite...');

  // Clear existing data for a clean run
  query('DELETE FROM bank_reconciliation_logs');
  query('DELETE FROM transactions');

  const tenantId = 'validation-tenant-id';
  const results: any[] = [];

  const testCases = [
    {
      id: '1.1',
      title: 'Exact Invoice Match',
      bankTx: { date: '2026-06-01', description: 'INV-1001 Payment', amount: 1200.00, type: 'RECEIVE' },
      glMatches: [
        { invoiceID: 'inv-1001', invoiceNumber: 'INV-1001', total: 1200.00, amountDue: 1200.00, date: '2026-06-01', contact: { name: 'Customer A' } }
      ],
      expectedRule: 'RULE-1.1-EXACT-INV',
      expectedReview: false
    },
    {
      id: '1.2',
      title: 'Fuzzy Name & Close Date Match',
      bankTx: { date: '2026-06-03', description: 'Starbucks Coffee', amount: 15.50, type: 'SPEND' },
      glMatches: [
        { invoiceID: 'inv-star', invoiceNumber: 'S-1', total: 15.50, amountDue: 15.50, date: '2026-06-01', contact: { name: 'Starbucks' } }
      ],
      expectedRule: 'RULE-2.1-CLOSE-DATE-INV',
      expectedReview: false
    },
    {
      id: '1.3',
      title: 'Merchant Fee Adjustment',
      bankTx: { date: '2026-06-07', description: 'Stripe Payout', amount: 970.00, type: 'RECEIVE' },
      glMatches: [
        { invoiceID: 'inv-1004', invoiceNumber: 'INV-1004', total: 1000.00, amountDue: 1000.00, date: '2026-06-07', contact: { name: 'Stripe' } }
      ],
      expectedRule: 'RULE-1.3-MERCHANT-FEE',
      expectedReview: false
    },
    {
      id: '3.1',
      title: 'Ambiguous Duplicate Amounts',
      bankTx: { date: '2026-06-12', description: 'Check 501', amount: 5000.00, type: 'SPEND' },
      glMatches: [
        { invoiceID: 'bill-100', invoiceNumber: 'BILL-100', total: 5000.00, amountDue: 5000.00, date: '2026-06-10', contact: { name: 'Vendor X' } },
        { invoiceID: 'bill-200', invoiceNumber: 'BILL-200', total: 5000.00, amountDue: 5000.00, date: '2026-06-11', contact: { name: 'Vendor Y' } }
      ],
      expectedRule: 'RULE-3.1-AMBIGUOUS-MATCH',
      expectedReview: true
    },
    {
        id: '4.1',
        title: 'Fixed Asset Capitalization',
        bankTx: { date: '2026-06-22', description: 'Apple Store', amount: 3200.00, type: 'SPEND' },
        glMatches: [],
        expectedRule: 'RULE-4.1-CAPITALIZATION-REVIEW',
        expectedReview: true
    },
    {
        id: '4.2',
        title: 'Prepaid Expense Threshold',
        bankTx: { date: '2026-07-01', description: 'State Farm Insurance', amount: 1800.00, type: 'SPEND' },
        glMatches: [
            { invoiceID: 'bill-777', invoiceNumber: 'BILL-777', total: 1800.00, amountDue: 1800.00, date: '2026-07-01', contact: { name: 'State Farm' } }
        ],
        expectedRule: 'RULE-4.2-PREPAID-REVIEW',
        expectedReview: true
    },
    {
        id: '4.3',
        title: 'Duplicate Bill Detection',
        bankTx: { date: '2026-07-05', description: 'Adobe Inc', amount: 52.99, type: 'SPEND' },
        glMatches: [
            { invoiceID: 'bill-303', invoiceNumber: 'BILL-303', total: 52.99, amountDue: 52.99, date: '2026-07-05', contact: { name: 'Adobe Inc', contactID: 'adobe-id' } }
        ],
        extraMocks: {
            // Mock for duplicateCheck
            duplicateCheck: [
                { invoiceID: 'bill-202', invoiceNumber: 'BILL-202', total: 52.99, amountDue: 0, status: 'PAID', contact: { name: 'Adobe Inc', contactID: 'adobe-id' } }
            ]
        },
        expectedRule: 'RULE-4.3-DUPLICATE-BILL-WARNING',
        expectedReview: true
    },
    {
        id: '4.4',
        title: 'Related Party Flagging',
        bankTx: { date: '2026-07-10', description: "Owner's Sister Consulting", amount: 5000.00, type: 'SPEND' },
        glMatches: [],
        expectedRule: 'RULE-4.4-RELATED-PARTY',
        expectedReview: true
    },
    {
        id: '4.5',
        title: 'Deferred Revenue',
        bankTx: { date: '2026-07-15', description: 'Customer Gold Deposit', amount: 10000.00, type: 'RECEIVE' },
        glMatches: [],
        expectedRule: 'RULE-4.5-DEFERRED-REVENUE-REVIEW',
        expectedReview: true
    },
    {
        id: '4.6',
        title: 'Accrued Liability',
        bankTx: { date: '2026-08-05', description: 'City Power & Light (July)', amount: 350.00, type: 'SPEND' },
        glMatches: [],
        expectedRule: 'RULE-4.6-ACCRUAL-REVIEW',
        expectedReview: true
    },
    {
        id: '4.9',
        title: 'Intercompany Transfer',
        bankTx: { date: '2026-08-10', description: 'Transfer to Accrue UK Ltd', amount: 15000.00, type: 'SPEND' },
        glMatches: [],
        expectedRule: 'RULE-4.9-INTERCOMPANY-REVIEW',
        expectedReview: true
    },
    {
        id: '4.10',
        title: 'Suspense Account Flagging',
        bankTx: { date: '2026-08-15', description: 'Unknown Inflow REF-999', amount: 7500.00, type: 'RECEIVE' },
        glMatches: [],
        expectedRule: 'RULE-4.10-SUSPENSE-ACCOUNT',
        expectedReview: true
    }
  ];

  for (const tc of testCases) {
    console.log(`\nExecuting Case ${tc.id}: ${tc.title}`);
    
    // 1. Insert bank transaction
    const txId = uuidv4();
    query(`INSERT INTO transactions (id, xero_transaction_id, date, amount, currency, description, type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [txId, `xero-tx-${tc.id}`, tc.bankTx.date, tc.bankTx.amount, 'USD', tc.bankTx.description, tc.bankTx.type, 'pending']);

    // 2. Create mock Xero Client
    const mockXero = {
      accountingApi: {
        getInvoices: async (tId: string, modSince: any, where: string) => {
          console.log(`   Mock Xero.getInvoices called with: ${where}`);
          if (where.includes('AmountDue == 0')) {
              // This is the duplicate check
              return { body: { invoices: tc.extraMocks?.duplicateCheck || [] } };
          }
          return { body: { invoices: tc.glMatches } };
        }
      }
    };

    // 3. Run reconciliation
    try {
      const reconciliationResults = await TransactionService.reconcile(tenantId, mockXero);
      
      // 4. Verify results
      const logEntry = query(`SELECT * FROM bank_reconciliation_logs WHERE transaction_id = ?`, [txId])[0];
      const updatedTx = query(`SELECT * FROM transactions WHERE id = ?`, [txId])[0];

      const passed = logEntry && logEntry.rule_id === tc.expectedRule && updatedTx.status === (tc.expectedReview ? 'needs_review' : 'reconciled');
      
      results.push({
        id: tc.id,
        title: tc.title,
        status: passed ? 'PASS' : 'FAIL',
        actualRule: logEntry?.rule_id || 'NONE',
        expectedRule: tc.expectedRule,
        actualStatus: updatedTx.status,
        expectedStatus: tc.expectedReview ? 'needs_review' : 'reconciled',
        reasoning: logEntry ? JSON.parse(logEntry.supporting_docs).reasoning : 'No log entry'
      });

      console.log(`   Result: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
          console.log(`   Actual Rule: ${logEntry?.rule_id || 'NONE'}, Expected: ${tc.expectedRule}`);
          console.log(`   Actual Status: ${updatedTx.status}, Expected: ${tc.expectedReview ? 'needs_review' : 'reconciled'}`);
      }
    } catch (error: any) {
      console.error(`   Error executing case ${tc.id}:`, error.message);
      results.push({
        id: tc.id,
        title: tc.title,
        status: 'ERROR',
        error: error.message
      });
    }
  }

  // Generate Report
  let report = '# Reconciliation Engine Validation Report\n\n';
  report += `Date: ${new Date().toISOString()}\n\n`;
  report += '| Case ID | Title | Status | Actual Rule | Expected Rule | Actual Status | Expected Status | Reasoning |\n';
  report += '|---' + '|---'.repeat(7) + '|\n';

  for (const r of results) {
    if (r.status === 'ERROR') {
        report += `| ${r.id} | ${r.title} | ❌ ERROR | - | - | - | - | ${r.error} |\n`;
    } else {
        report += `| ${r.id} | ${r.title} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.actualRule} | ${r.expectedRule} | ${r.actualStatus} | ${r.expectedStatus} | ${r.reasoning} |\n`;
    }
  }

  const reportPath = '/home/team/shared/validation_results.md';
  fs.writeFileSync(reportPath, report);
  console.log(`\nValidation complete. Report saved to ${reportPath}`);
}

runValidation();
