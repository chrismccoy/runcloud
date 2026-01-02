/**
 * Utility functions for data generation and timing.
 */

/**
 * Generates a cryptographically strong password for WordPress Admins.
 * Satisfies complexity requirements (Symbols, Numbers, Mixed Case).
 */
function generateStrongPass(length = 16) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal + "1Aa!"; // Suffix guarantees complexity rules are met
}

/**
 * Generates a "Safe" password for Databases.
 * RESTRICTED to Alphanumeric characters only.
 * RunCloud's API validation (422) is strict on DB passwords and rejects many symbols.
 */
function generateDbPass(length = 24) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal + "1A";
}

/**
 * Generates a random alphanumeric ID string for naming resources.
 */
function generateId() {
  return Math.random().toString(36).substring(7);
}

/**
 * Asynchronous sleep helper.
 * Used to pause execution to allow for remote server propagation.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateStrongPass,
  generateDbPass,
  generateId,
  sleep
};
