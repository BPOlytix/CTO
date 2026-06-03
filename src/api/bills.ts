/**
 * Accrue AI - Bill/Invoice Processing API Routes
 */
import { Router } from 'express';
import { handleBillUpload } from '../services/bill-processing.js';

const router = Router();

/**
 * POST /api/bills/process
 * Process a bill from raw OCR text.
 * Body: { tenantId, ocrText, fileName }
 */
router.post('/process', async (req, res) => {
  try {
    const { tenantId, ocrText, fileName } = req.body;

    if (!tenantId || !ocrText) {
      return res.status(400).json({ error: 'tenantId and ocrText are required' });
    }

    const result = await handleBillUpload(
      ocrText,
      fileName || 'uploaded-bill.txt',
      tenantId,
    );

    const statusCode = result.status === 'failed' ? 422 : 200;
    return res.status(statusCode).json(result);
  } catch (error: any) {
    console.error('Bill processing error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bills/process/test
 * Process a test bill with built-in mock data (for demo/QA purposes).
 */
router.post('/process/test', async (req, res) => {
  const { tenantId } = req.body;

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  // Test bill scenarios from docs/reconciliation_test_scenarios.md
  const testScenarios = [
    {
      name: 'AWS Cloud Bill (OPEX)',
      text: `Amazon Web Services
        Date: 2026-05-15
        Invoice #: INV-AWS-2026-05
        Description: Monthly Cloud Hosting Services
        Total: $1,200.00`,
    },
    {
      name: 'Server Hardware (Capital Expenditure > $2,500)',
      text: `Dell Technologies
        Date: 2026-05-20
        Invoice #: DELL-SRV-001
        Description: PowerEdge R750 Server
        Total: $8,500.00`,
    },
    {
      name: 'Shipping Charges (COGS)',
      text: `Global Logistics Ltd
        Date: 2026-05-18
        Invoice #: GL-2026-5678
        Description: Freight Shipping Charges
        Total: $450.00`,
    },
  ];

  const results = [];
  for (const scenario of testScenarios) {
    const result = await handleBillUpload(scenario.text, `${scenario.name}.txt`, tenantId);
    results.push({ scenario: scenario.name, result });
  }

  return res.status(200).json({ results });
});

export default router;