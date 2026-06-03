import { Router } from 'express';
import { XeroService } from '../services/xero';

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

router.post('/refresh/:tenantId', async (req, res) => {
  try {
    const tokenSet = await XeroService.refreshToken(req.params.tenantId);
    res.json({ message: 'Token refreshed', tokenSet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
