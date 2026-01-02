/**
 * Provisioning Service
 * Coordinates the Configuration -> API Calls -> Delays -> Feedback.
 */

const { RunCloudClient } = require('../core/RunCloudClient');
const { Logger } = require('../utils/logger');
const { generateDbPass, generateId, sleep } = require('../utils/helpers');
const CONSTANTS = require('../config/constants');

class ProvisioningService {
  constructor(configManager) {
    this.cfg = configManager.get();
    this.client = new RunCloudClient(this.cfg.apiKey, this.cfg.serverId);
  }

  /**
   * Runs the full provisioning.
   */
  async run() {
    Logger.header(`Provisioning ${this.cfg.appType === 'custom' ? 'Custom App' : 'WordPress Site'}...`);
    this._printInitialSummary();

    let webAppId;
    let finalDetails = {};

    try {
      if (this.cfg.appType === CONSTANTS.APP_TYPES.CUSTOM) {
        webAppId = await this._provisionCustomApp();
      } else {
        const result = await this._provisionWordPress();
        webAppId = result.id;
        finalDetails = result.details;
      }

      Logger.success(`${this.cfg.appType === 'custom' ? 'App' : 'WordPress'} Created (ID: ${webAppId})`);

      // Delay
      // Custom apps only need delay if SSL is requested.
      // WordPress needs delay for Hub, SSL, or Settings patches.
      const isWp = this.cfg.appType === CONSTANTS.APP_TYPES.WORDPRESS;
      const needsWait = this.cfg.installSsl || (isWp && (this.cfg.installHub || this.cfg.unrestrictedPhp));

      if (needsWait) {
        Logger.step('Waiting for file system propagation (5s)...');
        await sleep(5000);
      }

      // Post Provisioning Steps

      // WordPress Specific: Patch FPM and Install Hub
      if (isWp) {
        if (this.cfg.unrestrictedPhp) {
          await this._unlockPhpFunctions(webAppId);
        }
        if (this.cfg.installHub) {
          await this._installHub(webAppId);
        } else {
          Logger.info('ℹ️  Skipping RunCloud Hub installation.');
        }
      }

      // Install SSL
      if (this.cfg.installSsl) {
        await this._installSsl(webAppId);
      }

      // Summary
      this._printFinalSummary(finalDetails);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Constructs the API Payload and generates a Custom Web App
   */
  async _provisionCustomApp() {
    Logger.step('Creating Custom WebApp Instance...');

    // Payload strictly structured for custom apps
    const payload = {
      name: this.cfg.appName,
      domainName: this.cfg.domainName,
      user: this.cfg.ownerId,
      stack: 'customnginx',
      disableFunctions: "",
      allowUrlFopen: true,

      // API Standard fields
      phpVersion: this.cfg.phpVersion,
      stackMode: 'production'
    };

    const result = await this.client.createCustomWebApp(payload);
    return result.id;
  }

  /**
   * Constructs the API Payload for creating a WordPress App.
   * Generates DB credentials and configures WP settings.
   */
  async _provisionWordPress() {
    Logger.step('Creating WordPress Instance...');

    // Prepare credentials
    const { wpPayload, dbDetails } = this._prepareWpData();

    const result = await this.client.createWordPress(wpPayload);

    return {
      id: result.id,
      details: { wpPayload, dbDetails }
    };
  }

  /**
   * Helper to generate WordPress payload and DB credentials.
   */
  _prepareWpData() {
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

    // Assign owner if specified, otherwise RunCloud defaults to "runcloud" user
    if (this.cfg.ownerId) wpPayload.user = this.cfg.ownerId;

    return { wpPayload, dbDetails };
  }

  /**
   * Patches the WebApp to remove all disabled PHP functions.
   */
  async _unlockPhpFunctions(webAppId) {
    Logger.step('Unlocking PHP Functions (PATCH)...');
    try {
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
      // Must fetch Domain ID first
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
   * Logs startup configuration
   */
  _printInitialSummary() {
    Logger.kv('Type', this.cfg.appType.toUpperCase());
    Logger.kv('Domain', this.cfg.domainName);
    Logger.kv('App Name', this.cfg.appName);

    if (this.cfg.appType === 'custom') {
       Logger.kv('Stack', 'customnginx (Forced)');
       Logger.kv('PHP Mode', 'Unrestricted (Forced)');
    } else {
       Logger.kv('Stack', `${this.cfg.stackLabel} (${this.cfg.stack})`);
       const phpStatus = this.cfg.unrestrictedPhp ? 'Unrestricted 🔓' : 'Secure (Default) 🔒';
       Logger.kv('PHP Mode', phpStatus);
    }

    if (this.cfg.appType === 'wordpress') {
        if (this.cfg.installHub) {
            const hubDisplay = this.cfg.hub.type === 'redis'
              ? `Redis (Obj: ${this.cfg.hub.redisObject})`
              : 'Native Nginx';
            Logger.kv('Hub', hubDisplay);
        } else {
            Logger.kv('Hub', 'Disabled ⚪');
        }
    }

    Logger.kv('SSL', this.cfg.installSsl ? 'Enabled (Let\'s Encrypt)' : 'Disabled ⚪');
  }

  /**
   * Logs final success details
   */
  _printFinalSummary(details) {
    Logger.divider();
    Logger.success('Process Complete');
    Logger.kv('URL', `http://${this.cfg.domainName}`);

    // Only show WP Creds for a WP site
    if (this.cfg.appType === CONSTANTS.APP_TYPES.WORDPRESS && details.wpPayload) {
        Logger.kv('User', details.wpPayload.adminUsername);
        const passLabel = this.cfg.isAutoPassword ? ' (Generated)' : '';
        Logger.kv('Pass', `${details.wpPayload.password}${passLabel}`);
        Logger.kv('Email', details.wpPayload.adminEmail);
        Logger.kv('DB Name', details.dbDetails.name);
    } else {
        Logger.info('   Custom App created. Please configure your application files via SFTP/Git.');
    }

    Logger.divider();
  }
}

module.exports = { ProvisioningService };
