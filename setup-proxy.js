#!/usr/bin/env node

/**
 * Configures Nginx Reverse Proxy for Node.js apps on RunCloud.
 * Automatically detects the next available port by scanning existing configs.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const execPromise = util.promisify(exec);

// Constants
const CONFIG_DIR = '/etc/nginx-rc/extra.d';
const START_PORT = 3000;

/**
 * Scans existing Nginx config files to find the highest port currently in use.
 */
async function findNextPort() {
  try {
    // Check if directory exists
    try {
      await fs.access(CONFIG_DIR);
    } catch {
      // If directory doesn't exist yet, start at base port
      return START_PORT;
    }

    const files = await fs.readdir(CONFIG_DIR);

    // Filter for files strictly matching the naming convention
    const confFiles = files.filter(f => f.endsWith('.location.root.server.conf'));

    if (confFiles.length === 0) return START_PORT;

    const usedPorts = [];

    // Process files in parallel for performance
    await Promise.all(confFiles.map(async (file) => {
      try {
        const content = await fs.readFile(path.join(CONFIG_DIR, file), 'utf8');

        // Regex to find 'proxy_pass http://127.0.0.1:XXXX;'
        // Matches 127.0.0.1: followed by digits
        const match = content.match(/127\.0\.0\.1:(\d+)/);

        if (match && match[1]) {
          usedPorts.push(parseInt(match[1], 10));
        }
      } catch (err) {
        console.warn(`⚠️  Could not read config file: ${file}. Skipping.`);
      }
    }));

    if (usedPorts.length === 0) return START_PORT;

    // Find Max + 1
    const maxPort = Math.max(...usedPorts);
    return maxPort + 1;

  } catch (error) {
    throw new Error(`Port Auto-Discovery Failed: ${error.message}`);
  }
}

(async () => {
  try {
    // Check for Root Privileges
    if (process.getuid && process.getuid() !== 0) {
      throw new Error('Permission Denied: This script must be run as root (sudo) to write to /etc/nginx-rc/.');
    }

    // Parse Arguments
    const argv = yargs(hideBin(process.argv))
      .option('site', {
        alias: 's',
        type: 'string',
        demandOption: true,
        description: 'Name of the site/app (used for filename)'
      })
      .option('port', {
        alias: 'p',
        type: 'number',
        description: 'Specific port to use (Optional. If omitted, next available port is used)'
      })
      .help()
      .argv;

    const siteName = argv.site;
    let appPort = argv.port;

    // Determine Port
    if (appPort) {
      console.log(`ℹ️  Manual port override detected.`);
    } else {
      console.log('🔍 Auto-detecting next available port...');
      appPort = await findNextPort();
    }

    // Define Configuration
    const fileName = `${siteName}.location.root.server.conf`;
    const filePath = path.join(CONFIG_DIR, fileName);

    const nginxConfig = `
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Host $http_host;
proxy_pass http://127.0.0.1:${appPort};
`;

    console.log(`\n🚀 Configuring Nginx Proxy...`);
    console.log(`   Site: ${siteName}`);
    console.log(`   Port: ${appPort}`);
    console.log(`   Path: ${filePath}`);

    // Write Configuration File
    await fs.writeFile(filePath, nginxConfig.trim());
    console.log('✅ Configuration file created.');

    // Test Nginx Configuration
    console.log('👉 Testing Nginx configuration...');
    try {
      await execPromise('nginx-rc -t');
      console.log('✅ Syntax OK.');
    } catch (testError) {
      // Rollback on syntax error
      await fs.unlink(filePath);
      throw new Error(`Nginx Syntax Check Failed. Reverting changes. Details: ${testError.stderr}`);
    }

    // Reload Nginx
    console.log('👉 Reloading Nginx...');
    await execPromise('systemctl reload nginx-rc');
    console.log('✅ Nginx Reloaded.');

    // Output Success
    console.log('\n-----------------------------------');
    console.log(`Proxy active: http://127.0.0.1:${appPort}`);
    //console.log(`PORT_ASSIGNED=${appPort}`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
})();
