/**
 * Centralized constants and configuration.
 */

module.exports = Object.freeze({
  /** Base URL for RunCloud API v3 */
  API_BASE: 'https://manage.runcloud.io/api/v3',

  /**
   * Supported Server Stacks mapping.
   */
  STACKS: {
    nginx: 'nativenginx', // Pure Nginx
    apache: 'hybrid',     // Nginx + Apache Proxy
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
//    '8.5': 'php85rc', coming soon?
  },

  /** Application Defaults */
  DEFAULTS: {
    USER: 'admin',
    PHP: '8.2',
    STACK: 'nginx',

    // Hub Defaults
    INSTALL_HUB: true,
    HUB_TYPE: 'native',
    REDIS_OBJ: false,

    // SSL Default
    INSTALL_SSL: false,

    // PHP Security Default (False = Secure/Restricted)
    UNRESTRICTED_PHP: false
  }
});
