/**
 * Handles parsing of CLI arguments and Environment variables to build the runtime config.
 */

require('dotenv').config();

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const CONSTANTS = require('./constants');
const { generateStrongPass } = require('../utils/helpers');
const { Logger } = require('../utils/logger');

class ConfigManager {
  /**
   * Initializes configuration by parsing sources and validating requirements.
   */
  constructor() {
    this.argv = this._parseArgs();
    this.env = process.env;
    this.config = this._resolveConfig();
    this._validate();
  }

  /**
   * Returns the onfiguration object.
   */
  get() {
    return this.config;
  }

  /**
   * Defines and parses CLI arguments
   */
  _parseArgs() {
    return yargs(hideBin(process.argv))
      // App Type Selection
      .option('type', {
        alias: 't',
        type: 'string',
        default: CONSTANTS.DEFAULTS.TYPE,
        choices: Object.values(CONSTANTS.APP_TYPES),
        description: 'Application Type (wordpress or custom)'
      })

      // Site
      .option('domain', { alias: 'd', type: 'string', demandOption: true, description: 'Domain name' })
      .option('app', { alias: 'a', type: 'string', demandOption: true, description: 'App Name' })

      // WP Credentials
      .option('user', { alias: 'u', type: 'string', description: 'WP Admin User' })
      .option('password', { alias: 'P', type: 'string', description: 'WP Admin Password' })
      .option('email', { alias: 'e', type: 'string', description: 'WP Admin Email' })

      // Stack
      .option('owner', { alias: 'o', type: 'number', description: 'System User ID (Required for Custom Apps)' })
      .option('php', { alias: 'p', type: 'string', default: '8.2', choices: Object.keys(CONSTANTS.PHP_VERSIONS) })
      .option('stack', { alias: 's', type: 'string', default: 'nginx', choices: ['nginx', 'apache'], description: 'Stack for WP (Custom always uses customnginx)' })

      // Hub & SSL
      .option('hub', { type: 'boolean', description: 'Install RunCloud Hub Plugin (WP Only)' })
      .option('hub-type', { type: 'string', choices: ['native', 'redis'], description: 'RunCloud Hub Cache Type' })
      .option('redis-obj', { type: 'boolean', description: 'Enable Redis Object Cache' })
      .option('ssl', { type: 'boolean', description: 'Provision Let\'s Encrypt SSL' })

      // PHP Security
      .option('unrestricted', {
        type: 'boolean',
        description: 'Remove disabled PHP functions (Enable exec, shell_exec, etc)'
      })
      .help()
      .argv;
  }

  /**
   * Resolves configuration using CLI > ENV > Default
   */
  _resolveConfig() {
    // User Credentials
    const adminUser = this.argv.user || this.env.RC_ADMIN_USER || CONSTANTS.DEFAULTS.USER;
    const adminPassword = this.argv.password || this.env.RC_ADMIN_PASSWORD || generateStrongPass();
    const isAutoPassword = !this.argv.password && !this.env.RC_ADMIN_PASSWORD;

    // Hub
    let installHub;
    if (this.argv.hub !== undefined) {
      installHub = this.argv.hub;
    } else if (this.env.RC_INSTALL_HUB !== undefined) {
      installHub = this.env.RC_INSTALL_HUB === 'true';
    } else {
      installHub = CONSTANTS.DEFAULTS.INSTALL_HUB;
    }

    // SSL
    let installSsl;
    if (this.argv.ssl !== undefined) {
      installSsl = this.argv.ssl;
    } else if (this.env.RC_INSTALL_SSL !== undefined) {
      installSsl = this.env.RC_INSTALL_SSL === 'true';
    } else {
      installSsl = CONSTANTS.DEFAULTS.INSTALL_SSL;
    }

    // Unrestricted PHP
    let unrestrictedPhp;
    if (this.argv.unrestricted !== undefined) {
      unrestrictedPhp = this.argv.unrestricted;
    } else if (this.env.RC_UNRESTRICTED_PHP !== undefined) {
      unrestrictedPhp = this.env.RC_UNRESTRICTED_PHP === 'true';
    } else {
      unrestrictedPhp = CONSTANTS.DEFAULTS.UNRESTRICTED_PHP;
    }

    // Hub Settings
    const hubType = this.argv['hub-type'] || this.env.RC_HUB_TYPE || CONSTANTS.DEFAULTS.HUB_TYPE;
    let redisObj = false;
    if (this.argv['redis-obj'] !== undefined) redisObj = this.argv['redis-obj'];
    else if (this.env.RC_HUB_REDIS_OBJ) redisObj = this.env.RC_HUB_REDIS_OBJ === 'true';

    return {
      serverId: this.env.RC_SERVER_ID,
      apiKey: this.env.RC_API_KEY,

      // Determine App Type
      appType: this.argv.type,

      domainName: this.argv.domain,
      appName: this.argv.app,

      ownerId: this.argv.owner || (this.env.RC_DEFAULT_USER ? parseInt(this.env.RC_DEFAULT_USER) : undefined),

      // WP Admin
      adminEmail: this.argv.email || this.env.RC_ADMIN_EMAIL || `admin@${this.argv.domain}`,
      adminUser,
      adminPassword,
      isAutoPassword,

      // Stack & Version
      phpVersion: CONSTANTS.PHP_VERSIONS[this.argv.php],
      stack: CONSTANTS.STACKS[this.argv.stack],
      stackLabel: this.argv.stack,

      // Feature Config
      installHub,
      installSsl,
      unrestrictedPhp,
      hub: {
        type: hubType,
        redisObject: hubType === 'redis' ? redisObj : false
      }
    };
  }

  /**
   * Validates required configuration fields.
   */
  _validate() {
    const required = ['serverId', 'apiKey'];
    const missing = required.filter(k => !this.config[k]);

    if (missing.length > 0) {
      Logger.error(`Missing required config: ${missing.join(', ')}.`);
      Logger.info('Please check your .env file or CLI arguments.');
      process.exit(1);
    }

    // Specific validation for Custom Apps
    if (this.config.appType === CONSTANTS.APP_TYPES.CUSTOM && !this.config.ownerId) {
      Logger.error('System User ID (Owner) is required for Custom Apps.');
      Logger.info('Please provide --owner <id> or set RC_DEFAULT_USER in .env');
      process.exit(1);
    }
  }
}

module.exports = { ConfigManager };
