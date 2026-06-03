import { XeroClient, TokenSet } from 'xero-node';
import { xeroConfig } from '../config/xero.js';
import { query } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

const xero = new XeroClient(xeroConfig);

export class XeroService {
  static async getAuthUrl() {
    return await xero.buildConsentUrl();
  }

  static async handleCallback(url: string) {
    const tokenSet = await xero.apiCallback(url);
    const tenants = await xero.updateTenants();
    const activeTenantId = tenants[0]?.tenantId || '';
    await this.saveTokenSet(tokenSet, activeTenantId);
    return tokenSet;
  }

  static async saveTokenSet(tokenSet: TokenSet, tenantId?: string) {
    const activeTenantId = tokenSet.activeTenantId || tenantId || '';

    // For simplicity, we'll use a fixed ID or lookup by activeTenantId
    const existing = query(
      `SELECT id FROM xero_connections WHERE tenant_id = '${activeTenantId}'`,
    );

    const expiresAt = new Date(
      Date.now() + (tokenSet.expires_in || 0) * 1000,
    ).toISOString();

    if (existing && existing.length > 0) {
      query(`UPDATE xero_connections SET 
        access_token = '${tokenSet.access_token}', 
        refresh_token = '${tokenSet.refresh_token}', 
        expires_at = '${expiresAt}',
        updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = '${activeTenantId}'`);
    } else {
      const id = uuidv4();
      query(`INSERT INTO xero_connections (id, tenant_id, org_name, access_token, refresh_token, expires_at) 
        VALUES ('${id}', '${activeTenantId}', 'Default Org', '${tokenSet.access_token}', '${tokenSet.refresh_token}', '${expiresAt}')`);
    }
  }

  static async getClient(tenantId: string) {
    const connection = query(
      `SELECT * FROM xero_connections WHERE tenant_id = '${tenantId}'`,
    );
    if (!connection || connection.length === 0)
      throw new Error('No connection found');

    const tokenSet = new TokenSet({
      access_token: connection[0].access_token,
      refresh_token: connection[0].refresh_token,
      expires_at: Math.floor(
        new Date(connection[0].expires_at).getTime() / 1000,
      ),
    });

    xero.setTokenSet(tokenSet);

    // Refresh if expired (or close to expiring)
    if (tokenSet.expired()) {
      const newTokenSet = await xero.refreshWithRefreshToken(
        xeroConfig.clientId,
        xeroConfig.clientSecret,
        connection[0].refresh_token,
      );
      await this.saveTokenSet(newTokenSet, tenantId);
    }

    return xero;
  }
}
