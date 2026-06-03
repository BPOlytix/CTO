import { Router } from 'express';
import { XeroService } from '../services/xero.js';
import { TransactionService } from '../services/transactions.js';

const router = Router();

router.get('/auth', async (req, res) => {
  try {
    const url = await XeroService.getAuthUrl();
    res.redirect(url);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const tokenSet = await XeroService.handleCallback(req.url);
    res.json({ message: 'Successfully connected to Xero', tokenSet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/:tenantId', async (req, res) => {
  try {
    const count = await TransactionService.syncTransactions(
      req.params.tenantId,
    );
    res.json({ message: `Successfully synced ${count} transactions` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
