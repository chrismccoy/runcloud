/**
 * Provisioning Service
 * Coordinates the Configuration -> API Calls -> Delays -> Feedback.
 */

const { RunCloudClient } = require('../core/RunCloudClient');
const { Logger } = require('../utils/logger');
const { generateDbPass, generateId, sleep } = require('../utils/helpers');

class ProvisioningService {
  constructor(configManager) {
    this.cfg = configManager.get();
    this.client = new RunCloudClient(this.cfg.apiKey, this.cfg.serverId);
  }

  /**
   * Runs the full provisioning.
   */
  async run() {
    Logger.header('Provisioning WordPress Site...');
    this._printInitialSummary();

    // Prepare Data
    const { wpPayload, dbDetails } = this._prepareData();

    // Create WordPress
    Logger.step('Creating WordPress Instance...');
    const result = await this.client.createWordPress(wpPayload);
    const webAppId = result.id;
    Logger.success(`WordPress Created (ID: ${webAppId})`);

    // Delay
    // Wait for FS if we are installing Hub, SSL, or Patching FPM settings.
    const needsWait = this.cfg.installHub || this.cfg.installSsl || this.cfg.unrestrictedPhp;

    if (needsWait) {
      Logger.step('Waiting for file system propagation (5s)...');
      await sleep(5000);
    }

    // Update FPM Settings
    // Must occur after so config files exist.
    if (this.cfg.unrestrictedPhp) {
      await this._unlockPhpFunctions(webAppId);
    }

    // Install Hub
    if (this.cfg.installHub) {
      await this._installHub(webAppId);
    } else {
      Logger.info('ℹ️  Skipping RunCloud Hub installation.');
    }

    // Install SSL
    if (this.cfg.installSsl) {
      await this._installSsl(webAppId);
    }

    // Summary
    this._printFinalSummary(wpPayload, dbDetails);
  }

  /**
   * Constructs the API Payload and generates unique DB credentials.
   */
  _prepareData() {
    const dbSuffix = generateId();
    const safeDbPassword = generateDbPass();

    const dbDetails = {
      name: `db_${dbSuffix}`,
      user: `u_${dbSuffix}`,
      pass: safeDbPassword
    };

    const wpPayload = {
      name: this.cfg.appName,
      domainName: this.cfg.domainName,
      siteTitle: `Site - ${this.cfg.domainName}`,

      adminUsername: this.cfg.adminUser,
      adminEmail: this.cfg.adminEmail,
      password: this.cfg.adminPassword,

      dbName: dbDetails.name,
      dbUser: dbDetails.user,
      dbPassword: dbDetails.pass,
      dbPrefix: 'wp_',

      phpVersion: this.cfg.phpVersion,
      stack: this.cfg.stack,
      stackMode: 'production',
    };

    if (this.cfg.ownerId) wpPayload.user = this.cfg.ownerId;

    return { wpPayload, dbDetails };
  }

  /**
   * Patches the WebApp to remove all disabled PHP functions.
   */
  async _unlockPhpFunctions(webAppId) {
    Logger.step('Unlocking PHP Functions (PATCH)...');
    try {
      // Sending empty string removes all restrictions
      const payload = { disableFunctions: "" };
      await this.client.updateFpmSettings(webAppId, payload);
      Logger.success('PHP Functions Unrestricted (exec, passthru enabled)');
    } catch (error) {
      Logger.warn(`Failed to update FPM settings: ${error.message}`);
    }
  }

  /**
   * Helper to handle Hub installation.
   */
  async _installHub(webAppId) {
    Logger.step('Installing RunCloud Hub...');
    try {
      await this.client.installHub(webAppId, this.cfg.hub);
      Logger.success('RunCloud Hub Installed');
    } catch (error) {
      Logger.warn(`Hub Installation Failed: ${error.message}`);
      Logger.info('   You can install this manually via the Dashboard.');
    }
  }

  /**
   * Helper to handle SSL installation.
   */
  async _installSsl(webAppId) {
    Logger.step('Configuring SSL (Let\'s Encrypt)...');
    try {
      const domainList = await this.client.getDomains(webAppId);
      const domainObj = domainList.data.find(d => d.name === this.cfg.domainName);

      if (!domainObj) throw new Error('Domain ID lookup failed.');

      await this.client.installSsl(webAppId, domainObj.id);
      Logger.success('SSL Installation Queued');
    } catch (error) {
      Logger.warn(`SSL Failed: ${error.message}`);
      Logger.info('   Note: DNS must point to this server IP for SSL to work.');
    }
  }

  /**
   * Logs startup configuration.
   */
  _printInitialSummary() {
    Logger.kv('Domain', this.cfg.domainName);
    Logger.kv('App Name', this.cfg.appName);
    Logger.kv('Stack', `${this.cfg.stackLabel} (${this.cfg.stack})`);

    // Feedback for PHP
    const phpStatus = this.cfg.unrestrictedPhp ? 'Unrestricted 🔓' : 'Secure (Default) 🔒';
    Logger.kv('PHP Mode', phpStatus);

    // Feedback for Hub
    if (this.cfg.installHub) {
      const hubDisplay = this.cfg.hub.type === 'redis'
        ? `Redis (Obj: ${this.cfg.hub.redisObject})`
        : 'Native Nginx';
      Logger.kv('Hub', hubDisplay);
    } else {
      Logger.kv('Hub', 'Disabled ⚪');
    }

    // Feedback for SSL
    Logger.kv('SSL', this.cfg.installSsl ? 'Enabled (Let\'s Encrypt)' : 'Disabled ⚪');
  }

  /**
   * Logs final success details.
   */
  _printFinalSummary(payload, dbDetails) {
    Logger.divider();
    Logger.success('Process Complete');

    Logger.kv('URL', `http://${this.cfg.domainName}`);
    Logger.kv('User', payload.adminUsername);
    const passLabel = this.cfg.isAutoPassword ? ' (Generated)' : '';
    Logger.kv('Pass', `${payload.password}${passLabel}`);
    Logger.kv('Email', payload.adminEmail);
    Logger.kv('DB Name', dbDetails.name);

    Logger.divider();
  }
}

module.exports = { ProvisioningService };
