/**
 * Accrue AI - Bill/Invoice Processing Service
 *
 * Orchestrates OCR extraction → GAAP categorization → capitalization check
 * → Xero draft creation.
 *
 * Follows: shared/sop_bill_processing.md, shared/gaap_mapping_rules.md
 * Docs reference: docs/billing_invoice_structures.md, docs/gaap_mapping_rules.md
 */

import { XeroService } from './xero.js';
import { simulateOcr, suggestGaapCategory, type OcrExtraction } from './ocr.js';
import { query } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface BillProcessingResult {
  billId: string;
  status: 'draft_created' | 'draft_for_review' | 'failed';
  ocrResult: OcrExtraction;
  gaapMapping: {
    accountCode: string;
    accountDescription: string;
    category: string;
    isCapitalExpenditure: boolean; // > $2,500 threshold
  };
  xeroDraftId: string | undefined;
  errors: string[];
}

/* ─── Configuration ────────────────────────────────────────────────────── */

const CAPITALIZATION_THRESHOLD = 2500; // $2,500
const SUSPENSE_ACCOUNT_CODE = '9999';

/* ─── Core Processing ──────────────────────────────────────────────────── */

/**
 * Process a bill from raw OCR text through to Xero draft creation.
 */
export async function processBill(
  rawText: string,
  fileReference: string,
  tenantId: string,
): Promise<BillProcessingResult> {
  const errors: string[] = [];

  // Step 1: Run OCR extraction
  const ocrResult = simulateOcr(rawText, fileReference);

  if (ocrResult.status === 'failed') {
    return {
      billId: ocrResult.billId,
      status: 'failed',
      ocrResult,
      gaapMapping: {
        accountCode: SUSPENSE_ACCOUNT_CODE,
        accountDescription: 'Suspense - OCR Failed',
        category: 'UNKNOWN',
        isCapitalExpenditure: false,
      },
      xeroDraftId: undefined,
      errors: [...ocrResult.errors, 'OCR extraction failed - manual entry required'],
    };
  }

  // Step 2: Determine GAAP category
  const suggestedMapping = suggestGaapCategory(ocrResult.extracted.vendorName);

  // Step 3: Check capitalization threshold ($2,500 rule)
  const isCapitalExpenditure = ocrResult.extracted.totalAmount > CAPITALIZATION_THRESHOLD;
  const finalAccountCode = isCapitalExpenditure ? '1500' : suggestedMapping.accountCode;
  const finalDescription = isCapitalExpenditure
    ? `Fixed Asset - ${suggestedMapping.description}`
    : suggestedMapping.description;

  // Step 4: Validate the extraction
  if (ocrResult.extracted.totalAmount <= 0) {
    errors.push('Bill amount is zero or negative');
  }
  if (!ocrResult.extracted.billDate) {
    errors.push('Bill date missing');
  }

  const gaapMapping = {
    accountCode: finalAccountCode,
    accountDescription: finalDescription,
    category: isCapitalExpenditure ? 'FIXED_ASSET' : suggestedMapping.gaapCategory,
    isCapitalExpenditure,
  };

  // Step 5: Create draft bill in Xero (or simulate if no credentials)
  let xeroDraftId: string | undefined;
  let status: BillProcessingResult['status'];

  try {
    xeroDraftId = await createXeroDraftBill(ocrResult, tenantId, finalAccountCode);
    status = ocrResult.status === 'low_confidence' ? 'draft_for_review' : 'draft_created';
  } catch (err: any) {
    errors.push(`Xero draft creation failed: ${err.message}`);
    status = 'draft_for_review';
  }

  // Step 6: Log to database
  logBillProcessing({
    billId: ocrResult.billId,
    vendorName: ocrResult.extracted.vendorName,
    amount: ocrResult.extracted.totalAmount,
    accountCode: finalAccountCode,
    isCapitalExpenditure,
    status,
    confidence: ocrResult.confidence,
    xeroDraftId,
  });

  return {
    billId: ocrResult.billId,
    status,
    ocrResult,
    gaapMapping,
    xeroDraftId,
    errors,
  };
}

/**
 * Create a draft bill in Xero via the API.
 * Falls back to simulated creation if Xero credentials aren't configured.
 */
async function createXeroDraftBill(
  ocr: OcrExtraction,
  tenantId: string,
  accountCode: string,
): Promise<string> {
  const { vendorName, billDate, dueDate, totalAmount, referenceNumber, lineItems } = ocr.extracted;

  // If mock credentials, simulate the draft
  if (process.env.XERO_CLIENT_ID === 'MOCK_CLIENT_ID' || !process.env.XERO_CLIENT_ID) {
    const mockId = uuidv4();
    console.log(`[MOCK] Created Xero draft bill ${mockId} for ${vendorName}: $${totalAmount}`);
    return mockId;
  }

  // Real Xero API call
  const xero = await XeroService.getClient(tenantId);
  const response = await xero.accountingApi.createPurchaseOrders(
    tenantId,
    {
      purchaseOrders: [
        {
          contact: { name: vendorName },
          date: billDate,
          reference: referenceNumber,
          lineItems: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            accountCode: accountCode,
            lineAmount: item.totalAmount,
          })),
          status: 'DRAFT' as any,
        },
      ],
    },
  );

  return response.body.purchaseOrders?.[0]?.purchaseOrderID || uuidv4();
}

/* ─── Database Logging ─────────────────────────────────────────────────── */

interface BillLog {
  billId: string;
  vendorName: string;
  amount: number;
  accountCode: string;
  isCapitalExpenditure: boolean;
  status: string;
  confidence: number;
  xeroDraftId: string | undefined;
}

function logBillProcessing(log: BillLog): void {
  try {
    const rules = {
      confidence: log.confidence,
      status: log.status,
      xeroDraftId: log.xeroDraftId || '',
      capitalized: log.isCapitalExpenditure
    };

    query(`
      INSERT INTO gaap_mapping_rules (id, xero_account_code, gaap_category, description, rules)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(xero_account_code) DO NOTHING
    `, [
      log.billId,
      log.accountCode,
      log.isCapitalExpenditure ? 'FIXED_ASSET' : 'EXPENSE',
      `Bill: ${log.vendorName} - $${log.amount}`,
      rules
    ]);
  } catch (err) {
    console.error('Failed to log bill processing:', err);
  }
}

/* ─── High-Level API ───────────────────────────────────────────────────── */

/**
 * API handler: process a bill from uploaded text content.
 * Returns the processing result including Xero draft status.
 */
export async function handleBillUpload(
  ocrText: string,
  fileName: string,
  tenantId: string,
): Promise<BillProcessingResult> {
  const result = await processBill(ocrText, fileName, tenantId);

  // Add warnings for high-value bills
  if (result.gaapMapping.isCapitalExpenditure) {
    result.errors.push(
      `Capitalization alert: Bill amount ($${result.ocrResult.extracted.totalAmount.toFixed(2)}) exceeds $2,500 threshold. Mapped to Fixed Asset account 1500. Depreciation setup required.`,
    );
  }

  // Add low confidence warnings
  if (result.ocrResult.confidence < 80) {
    result.errors.push(
      `Low confidence (${result.ocrResult.confidence}%): Review suggested categorization before approving.`,
    );
  }

  return result;
}