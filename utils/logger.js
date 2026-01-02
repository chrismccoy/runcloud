/**
 * Presentation layer for CLI output.
 * standardized logging with icons and formatting.
 */

const Logger = {
  /** Log generic info messages */
  info: (msg) => console.log(msg),

  /** Log success messages with checkmark */
  success: (msg) => console.log(`✅ ${msg}`),

  /** Log error messages with cross mark (stderr) */
  error: (msg) => console.error(`❌ ${msg}`),

  /** Log warnings with yield sign */
  warn: (msg) => console.error(`⚠️  ${msg}`),

  /** Log section headers with rocket */
  header: (msg) => console.log(`\n🚀 ${msg}`),

  /** Log intermediate steps with finger pointer */
  step: (msg) => console.log(`\n👉 ${msg}`),

  /**
   * Log Key-Value pairs with aligned padding.
   */
  kv: (k, v) => console.log(`   ${k.padEnd(14)}: ${v}`),

  /** Draw a horizontal divider line */
  divider: () => console.log('------------------------------------------------'),
};

module.exports = { Logger };
