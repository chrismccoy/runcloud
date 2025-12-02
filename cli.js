#!/usr/bin/env node

const { ProvisioningService } = require('./services/ProvisioningService');
const { ConfigManager } = require('./config/ConfigManager');
const { Logger } = require('./utils/logger');

(async () => {
  try {
    // Initialize Configuration
    const configManager = new ConfigManager();
    
    // Inject Config into Service Layer
    const service = new ProvisioningService(configManager);
    
    // Run
    await service.run();

  } catch (error) {
    // Global Error Trap
    Logger.error(error.message);
    process.exit(1);
  }
})();
