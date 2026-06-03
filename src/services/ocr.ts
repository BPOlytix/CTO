/**
 * Accrue AI - OCR Data Extraction Service
 *
 * Mock OCR engine that extracts structured data from bill/invoice text.
 * In production, this would integrate with a document AI service (e.g., Google Doc AI,
 * AWS Textract, or Xero's built-in OCR).
 *
 * Follows: shared/sop_bill_processing.md
 */

import { v4 as uuidv4 } from 'uuid';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface OcrExtraction {
  billId: string;
  status: 'success' | 'low_confidence' | 'failed';
  confidence: number; // 0-100
  extracted: {
    vendorName: string;
    billDate: string;   // YYYY-MM-DD
    dueDate: string;    // YYYY-MM-DD
    totalAmount: number; // Decimal dollars
    referenceNumber: string;
    lineItems: OcrLineItem[];
    rawText: string;
  };
  errors: string[];
}

export interface OcrLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

/* ─── Mock Vendor Patterns (for demo/testing) ──────────────────────────── */

const VENDOR_PATTERNS: Record<string, { gaapCategory: string; accountCode: string; description: string }> = {
  'AMAZON WEB SERVICES': { gaapCategory: 'OPEX', accountCode: '6050', description: 'IT Infrastructure' },
  'AWS': { gaapCategory: 'OPEX', accountCode: '6050', description: 'IT Infrastructure' },
  'GOOGLE CLOUD': { gaapCategory: 'OPEX', accountCode: '6050', description: 'IT Infrastructure' },
  'MICROSOFT': { gaapCategory: 'OPEX', accountCode: '6050', description: 'Software Subscriptions' },
  'SLACK': { gaapCategory: 'OPEX', accountCode: '6050', description: 'Software Subscriptions' },
  'GLOBAL LOGISTICS LTD': { gaapCategory: 'COGS', accountCode: '5010', description: 'Shipping & Freight' },
  'WELLS FARGO': { gaapCategory: 'OPEX', accountCode: '6010', description: 'Bank Fees' },
  'LANDLORD INC': { gaapCategory: 'OPEX', accountCode: '6020', description: 'Rent' },
  'STAPLES': { gaapCategory: 'OPEX', accountCode: '6030', description: 'Office Supplies' },
  'DELOITTE': { gaapCategory: 'OPEX', accountCode: '6040', description: 'Professional Fees' },
};

const DEFAULT_CATEGORY_OPEX = { gaapCategory: 'OPEX', accountCode: '6099', description: 'Other Operating Expense' };

/* ─── Python OCR Wrapper ───────────────────────────────────────────────── */

/**
 * Executes the Python OCR pipeline to extract data from a bill/invoice file.
 */
export async function processBillOcr(filePath: string): Promise<OcrExtraction> {
  const pythonPath = '/home/agent-automation-dev/ocr_venv/bin/python3';
  const scriptPath = path.join(process.cwd(), 'python_ocr', 'main.py');

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const result = spawnSync(pythonPath, [scriptPath, filePath], { encoding: 'utf8' });

  if (result.error) {
    console.error('Python OCR process error:', result.error);
    return simulateOcr('PIPELINE_ERROR', filePath); // Fallback to mock
  }

  try {
    const output = JSON.parse(result.stdout);
    if (output.status === 'failed') {
      console.warn('Python OCR pipeline failed, falling back to mock:', output.errors);
      return simulateOcr('PIPELINE_FAILED', filePath);
    }

    const { extracted } = output;
    return {
      billId: uuidv4(),
      status: 'success',
      confidence: 95,
      extracted: {
        vendorName: extracted.vendor,
        billDate: normalizeDate(extracted.date),
        dueDate: '', // To be implemented in parser
        totalAmount: extracted.total,
        referenceNumber: `EXT-${uuidv4().slice(0, 8).toUpperCase()}`,
        lineItems: extracted.line_items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unit_amount,
          totalAmount: item.total_amount,
        })),
        rawText: extracted.raw_text,
      },
      errors: [],
    };
  } catch (e) {
    console.error('Failed to parse Python OCR output:', e);
    return simulateOcr('PARSE_ERROR', filePath);
  }
}

/* ─── Mock OCR Engine ──────────────────────────────────────────────────── */

/**
 * Simulate OCR processing on a raw text string.
 * In production this would call an actual OCR/API service.
 */
export function simulateOcr(rawText: string, fileReference: string): OcrExtraction {
  const errors: string[] = [];
  const upperText = rawText.toUpperCase();

  // 1. Extract vendor name (look for known patterns at the start of text)
  const vendorName = extractVendorName(upperText, rawText);

  // 2. Extract reference number (e.g., "INV-12345" or "Invoice #12345")
  const referenceNumber = extractReference(rawText);

  // 3. Extract dates
  const billDate = extractDate(rawText, 'bill');
  const dueDate = extractDate(rawText, 'due');

  // 4. Extract amount
  const totalAmount = extractTotalAmount(rawText);

  // 5. Extract line items (simplified - in production would parse table structure)
  const lineItems = extractLineItems(rawText, totalAmount);

  // 6. Calculate confidence
  const confidence = calculateConfidence(vendorName, totalAmount, billDate, errors);

  return {
    billId: uuidv4(),
    status: confidence >= 80 ? 'success' : confidence >= 50 ? 'low_confidence' : 'failed',
    confidence,
    extracted: {
      vendorName,
      billDate,
      dueDate,
      totalAmount,
      referenceNumber,
      lineItems,
      rawText,
    },
    errors,
  };
}

/* ─── Internal Extraction Helpers ──────────────────────────────────────── */

function extractVendorName(upperText: string, originalText: string): string {
  for (const vendor of Object.keys(VENDOR_PATTERNS)) {
    if (upperText.includes(vendor)) {
      return capitalizeWords(vendor);
    }
  }
  // Fallback: try first line of text as vendor name
  const firstLine = originalText.split('\n')[0]?.trim() || 'Unknown Vendor';
  return firstLine;
}

function extractReference(text: string): string {
  const match = text.match(/(?:INV|INVOICE|BILL|REF)\s*[#:\s]*([A-Z0-9][-A-Z0-9]+)/i);
  return match?.[1] || `OCR-${uuidv4().slice(0, 8).toUpperCase()}`;
}

function extractDate(text: string, type: 'bill' | 'due'): string {
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\w+ \d{1,2},? \d{4})/,
  ];

  // For bill date: look for "Date:" or first date
  // For due date: look for "Due:" or "Due Date:"
  let searchText = text;
  if (type === 'due') {
    const dueMatch = text.match(/(?:DUE|DUE DATE|PAYMENT DUE)[:\s]*([^\n]+)/i);
    if (dueMatch?.[1]) searchText = dueMatch[1];
  } else {
    const dateLabel = text.match(/(?:DATE|INVOICE DATE|BILL DATE)[:\s]*([^\n]+)/i);
    if (dateLabel?.[1]) searchText = dateLabel[1];
  }

  for (const pattern of datePatterns) {
    const match = searchText.match(pattern);
    if (match) {
      return normalizeDate(match[1]!);
    }
  }

  // Fallback: today's date
  return new Date().toISOString().split('T')[0]!;
}

function extractTotalAmount(text: string): number {
  // Look for "Total:" or "Amount:" patterns
  const totalMatch = text.match(/(?:TOTAL|AMOUNT DUE|BALANCE DUE)[:\s$]*([0-9,]+\.?\d*)/i);
  if (totalMatch) {
    return parseFloat(totalMatch[1]!.replace(/,/g, ''));
  }

  // Fallback: find the largest dollar amount in the text
  const amounts = text.match(/\$?([0-9,]+\.\d{2})/g);
  if (amounts) {
    const parsed = amounts.map(a => parseFloat(a.replace(/[$,]/g, '')));
    return Math.max(...parsed);
  }

  return 0;
}

function extractLineItems(text: string, totalAmount: number): OcrLineItem[] {
  // Simplified: create a single line item from the total if no lines found
  const lines = text.split('\n').filter(l => l.trim());
  const items: OcrLineItem[] = [];

  for (const line of lines) {
    const amountMatch = line.match(/\$?([0-9,]+\.\d{2})/);
    if (amountMatch && !line.toUpperCase().includes('TOTAL') && !line.toUpperCase().includes('SUBTOTAL')) {
      const amt = parseFloat(amountMatch[1]!.replace(/,/g, ''));
      if (amt > 0 && amt <= totalAmount) {
        const desc = line.replace(/\$?[0-9,]+\.\d{2}/, '').trim();
        items.push({
          description: desc || 'Item',
          quantity: 1,
          unitAmount: amt,
          totalAmount: amt,
        });
      }
    }
  }

  // If no line items found, create one from total
  if (items.length === 0 && totalAmount > 0) {
    items.push({
      description: 'Service/Product',
      quantity: 1,
      unitAmount: totalAmount,
      totalAmount,
    });
  }

  return items;
}

function calculateConfidence(
  vendorName: string,
  amount: number,
  date: string,
  errors: string[],
): number {
  let confidence = 100;

  if (vendorName === 'Unknown Vendor' || vendorName === '') {
    confidence -= 30;
    errors.push('Vendor name could not be reliably extracted');
  }

  if (amount === 0) {
    confidence -= 40;
    errors.push('Amount could not be extracted');
  }

  if (!date || date === '') {
    confidence -= 20;
    errors.push('Date could not be reliably extracted');
  }

  // Check against known vendor patterns
  const upperVendor = vendorName.toUpperCase();
  const knownVendor = Object.keys(VENDOR_PATTERNS).find(k => upperVendor.includes(k));
  if (!knownVendor && vendorName !== 'Unknown Vendor') {
    confidence -= 10;
    errors.push('Vendor not in known GAAP mapping catalog');
  }

  return Math.max(0, Math.min(100, confidence));
}

/* ─── Helper Utilities ─────────────────────────────────────────────────── */

function normalizeDate(dateStr: string): string {
  // Handle MM/DD/YYYY
  const slashMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1]}-${slashMatch[2]}`;
  }

  // Handle "Month DD, YYYY"
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };
  const textMatch = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (textMatch) {
    const month = months[textMatch[1]!.toLowerCase()] || '01';
    const day = textMatch[2]!.padStart(2, '0');
    return `${textMatch[3]}-${month}-${day}`;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  return dateStr;
}

function capitalizeWords(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Look up the suggested GAAP category for a vendor.
 */
export function suggestGaapCategory(vendorName: string): {
  gaapCategory: string;
  accountCode: string;
  description: string;
} {
  const upperVendor = vendorName.toUpperCase();
  for (const [pattern, mapping] of Object.entries(VENDOR_PATTERNS)) {
    if (upperVendor.includes(pattern)) {
      return mapping;
    }
  }
  return DEFAULT_CATEGORY_OPEX;
}