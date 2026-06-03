import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/transactions.js';
import { handleBillUpload } from '../services/bill-processing.js';
import { suggestGaapCategory } from '../services/ocr.js';
import { XeroService } from '../services/xero.js';
import { ReportService } from '../services/reports.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Handle Bank Reconciliation Intent
 * Intent: RECONCILE_BANK_ACCOUNT
 */
router.post('/reconcile', async (req: Request, res: Response) => {
  const { tenantId, account_id, date_range, confirmed } = req.body;

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  try {
    if (!confirmed) {
      // Analyze + Draft
      const pendingCount = 5; // Mock: would query DB for pending transactions
      return res.json({
        intent: 'RECONCILE_BANK_ACCOUNT',
        parameters: { account_id, date_range },
        draft: `I found ${pendingCount} pending transactions to reconcile for ${account_id || 'all accounts'}. Shall I proceed?`,
        confirmed: false
      });
    }

    // Confirm + Execute
    const results = await TransactionService.reconcile(tenantId);
    res.json({
      intent: 'RECONCILE_BANK_ACCOUNT',
      message: 'Reconciliation completed.',
      results,
      confirmed: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Create Invoice Intent
 * Intent: CREATE_INVOICE
 */
router.post('/invoice', async (req: Request, res: Response) => {
  const { tenantId, contact_name, line_items, due_date, account_code, confirmed } = req.body;

  if (!tenantId || !contact_name || !line_items) {
    return res.status(400).json({ error: 'tenantId, contact_name, and line_items are required' });
  }

  try {
    if (!confirmed) {
      // Analyze + Draft
      const total = line_items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_amount), 0);
      return res.json({
        intent: 'CREATE_INVOICE',
        parameters: { contact_name, line_items, due_date, account_code },
        draft: `I've drafted an invoice for ${contact_name} for a total of $${total.toFixed(2)}. Shall I send it?`,
        confirmed: false
      });
    }

    // Confirm + Execute
    const invoice = await XeroService.createInvoice(tenantId, {
      contactName: contact_name,
      lineItems: line_items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unit_amount
      })),
      dueDate: due_date,
      accountCode: account_code
    });

    res.json({
      intent: 'CREATE_INVOICE',
      message: `Invoice ${invoice.invoiceID} created successfully.`,
      invoiceId: invoice.invoiceID,
      confirmed: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Process Bill Intent
 * Intent: PROCESS_BILL
 */
router.post('/bill', async (req: Request, res: Response) => {
  const { tenantId, vendor_name, amount, date, attachment_id, confirmed } = req.body;

  if (!tenantId || !vendor_name || !amount || !date) {
    return res.status(400).json({ error: 'tenantId, vendor_name, amount, and date are required' });
  }

  try {
    if (!confirmed) {
      // Analyze + Draft
      const mapping = suggestGaapCategory(vendor_name);
      return res.json({
        intent: 'PROCESS_BILL',
        parameters: { vendor_name, amount, date, attachment_id },
        draft: `I've prepared a bill from ${vendor_name} for $${amount}. It will be categorized as '${mapping.description}' (${mapping.accountCode}). Shall I record it?`,
        confirmed: false
      });
    }

    // Confirm + Execute
    const mapping = suggestGaapCategory(vendor_name);
    const bill = await XeroService.createBill(tenantId, {
      vendorName: vendor_name,
      amount,
      date,
      accountCode: mapping.accountCode,
      description: mapping.description
    });

    res.json({
      intent: 'PROCESS_BILL',
      message: `Bill from ${vendor_name} recorded successfully.`,
      billId: bill.invoiceID,
      confirmed: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Generate Report Intent
 * Intent: GENERATE_REPORT
 */
router.post('/report', async (req: Request, res: Response) => {
  const { tenantId, report_type, period, confirmed } = req.body;

  if (!tenantId || !report_type || !period) {
    return res.status(400).json({ error: 'tenantId, report_type, and period are required' });
  }

  try {
    // Reports usually don't need double-confirmation for creation, but we can follow the pattern
    if (!confirmed) {
      return res.json({
        intent: 'GENERATE_REPORT',
        parameters: { report_type, period },
        draft: `I will generate a ${report_type} report for ${period}. Is that correct?`,
        confirmed: false
      });
    }

    // Confirm + Execute
    let reportData;
    if (report_type.toUpperCase().includes('PROFIT') || report_type.toUpperCase().includes('P&L')) {
      reportData = await ReportService.getProfitAndLoss(tenantId);
    } else if (report_type.toUpperCase().includes('BALANCE')) {
      reportData = await ReportService.getBalanceSheet(tenantId);
    } else {
      throw new Error(`Unsupported report type: ${report_type}`);
    }

    res.json({
      intent: 'GENERATE_REPORT',
      message: `Report ${report_type} for ${period} is ready.`,
      reportData,
      confirmed: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle GAAP Advice Intent
 * Intent: GAAP_ADVICE
 */
router.post('/gaap-advice', async (req: Request, res: Response) => {
  const { query: userQuery } = req.body;

  if (!userQuery) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    // Simple mock logic for GAAP advice
    let advice = "Based on GAAP principles, you should categorize this appropriately.";
    if (userQuery.toLowerCase().includes('laptop') || userQuery.toLowerCase().includes('computer')) {
      advice = "Laptops over $2,500 should be capitalized as Fixed Assets and depreciated over their useful life (typically 3 years).";
    } else if (userQuery.toLowerCase().includes('revenue')) {
      advice = "Revenue should be recognized when earned, regardless of when payment is received (Accrual Basis).";
    }

    res.json({
      intent: 'GAAP_ADVICE',
      query: userQuery,
      advice
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
