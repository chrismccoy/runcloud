/**
 * Handles HTTP Requests, Header injection, and API Errors
 */

const CONSTANTS = require('../config/constants');

class RunCloudClient {
  /**
   * apiKey - Bearer token.
   * serverId - Target server ID.
   */
  constructor(apiKey, serverId) {
    this.apiKey = apiKey;
    this.serverId = serverId;
  }

  /**
   * Provisions a WebApp container and installs WordPress.
   */
  async createWordPress(payload) {
    return this._request(`/servers/${this.serverId}/webapps/wordpress`, 'POST', payload);
  }

  /**
   * Installs the RunCloud Hub Caching & Optimization plugin.
   */
  async installHub(webAppId, hubConfig) {
    const payload = {
      cacheType: hubConfig.type,
      redisObjectCache: hubConfig.redisObject,
      cacheFolderSize: 50,
      cacheValidMinute: 480
    };
    return this._request(`/servers/${this.serverId}/webapps/${webAppId}/runcloudhub`, 'POST', payload);
  }

  /**
   * Retrieves list of domains for a WebApp to find the internal Domain ID.
   */
  async getDomains(webAppId) {
    return this._request(`/servers/${this.serverId}/webapps/${webAppId}/domains`, 'GET');
  }

  /**
   * Provisions SSL via Let's Encrypt.
   */
  async installSsl(webAppId, domainId) {
    const payload = {
      advancedSSL: true,
      autoSSL: false,
      provider: "letsencrypt",
      enableHttp: false,
      enableHsts: false,
      authorizationMethod: "http-01",
      environment: "live"
    };
    return this._request(`/servers/${this.serverId}/webapps/${webAppId}/domains/${domainId}/ssl`, 'POST', payload);
  }

  /**
   * Updates PHP-FPM / Nginx Settings via PATCH.
   * Used to modify disabled functions
   */
  async updateFpmSettings(webAppId, payload) {
    return this._request(
      `/servers/${this.serverId}/webapps/${webAppId}/settings/fpmnginx`,
      'PATCH',
      payload
    );
  }

  /**
   * Wrapper for Fetch API.
   */
  async _request(endpoint, method, body = null) {
    const url = `${CONSTANTS.API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const options = { method, headers };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) this._handleError(response.status, data);
      return data;
    } catch (error) {
      if (error.cause?.code === 'ENOTFOUND') {
        throw new Error('Network Error: Could not connect to RunCloud API. Check internet connection.');
      }
      throw error;
    }
  }

  /**
   * Converts HTTP error codes into readable exceptions.
   */
  _handleError(status, data) {
    const msg = data.message || JSON.stringify(data);
    switch (status) {
      case 401: throw new Error(`Authentication Failed (401): Invalid Bearer Token.`);
      case 403: throw new Error(`Permission Denied (403): Credentials valid but access denied. Check RC_SERVER_ID.`);
      case 422:
        let detailStr = '';
        if (data.errors) detailStr = '\n   ' + Object.keys(data.errors).map(k => `${k}: ${data.errors[k].join(', ')}`).join('\n   ');
        throw new Error(`Validation Error (422): ${msg}${detailStr}`);
      default: throw new Error(`API Error (${status}): ${msg}`);
    }
  }
}

module.exports = { RunCloudClient };
