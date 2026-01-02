/**
 * Centralized constants and configuration.
 * Defines supported stacks, versions, and default behaviors for the CLI.
 */

module.exports = Object.freeze({
  /** Base URL for RunCloud API v3 */
  API_BASE: 'https://manage.runcloud.io/api/v3',

  /**
   * Supported Application Types.
   * Determines the provisioning strategy.
   */
  APP_TYPES: {
    WORDPRESS: 'wordpress',
    CUSTOM: 'custom'
  },

  /**
   * Supported Server Stacks mapping.
   * Maps CLI/Config values to API-compatible strings.
   */
  STACKS: {
    nginx: 'nativenginx', // Pure Nginx (Used for WordPress)
    apache: 'hybrid',     // Nginx + Apache Proxy (Used for WordPress)
    custom: 'customnginx' // Custom Web App (Forced for Custom Apps)
  },

  /**
   * Supported PHP Versions mapping.
   * CLI Flag -> API Value
   */
  PHP_VERSIONS: {
    '7.4': 'php74rc',
    '8.0': 'php80rc',
    '8.1': 'php81rc',
    '8.2': 'php82rc',
    '8.3': 'php83rc',
    '8.4': 'php84rc',
  },

  /** Application Defaults */
  DEFAULTS: {
    // General
    TYPE: 'wordpress',
    USER: 'admin',      // Default WP Admin Username
    PHP: '8.2',
    STACK: 'nginx',

    // Hub Defaults (WordPress Only)
    INSTALL_HUB: true,
    HUB_TYPE: 'native',
    REDIS_OBJ: false,

    // SSL Default
    INSTALL_SSL: false,

    // PHP Security Default (False = Secure/Restricted)
    UNRESTRICTED_PHP: false
  }
});

