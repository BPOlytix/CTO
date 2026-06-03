import dotenv from 'dotenv';
dotenv.config();

export const xeroConfig = {
  clientId: process.env.XERO_CLIENT_ID || 'MOCK_CLIENT_ID',
  clientSecret: process.env.XERO_CLIENT_SECRET || 'MOCK_CLIENT_SECRET',
  redirectUris: [
    process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/xero/callback',
  ],
  scopes:
    'offline_access openid profile email accounting.transactions accounting.settings accounting.contacts accounting.journals.read accounting.reports.read accounting.settings.read'.split(
      ' ',
    ),
};
