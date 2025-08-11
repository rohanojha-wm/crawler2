import { MonitoringConfig } from './types';
import { Database } from './database';
import { UrlMonitor } from './monitor';
import { WebServer } from './webserver';
import { ConfigLoader } from './config-loader';

class Application {
  private readonly database: Database;
  private readonly monitor: UrlMonitor;
  private readonly webServer: WebServer;

  constructor(config: MonitoringConfig) {
    this.database = new Database();
    this.monitor = new UrlMonitor(config, this.database);
    this.webServer = new WebServer(this.database);
  }

  start(): void {
    console.log('🚀 Starting URL Monitor Application...');
    
    // Start monitoring URLs
    this.monitor.startMonitoring();
    
    // Start web dashboard
    this.webServer.start(3000);
    
    console.log('✅ Application started successfully!');
    console.log('📊 Dashboard: http://localhost:3000');
    console.log('🔍 Monitoring URLs...');
  }

  stop(): void {
    console.log('🛑 Stopping URL Monitor Application...');
    
    this.monitor.stopMonitoring();
    this.webServer.stop();
    this.database.close();
    
    console.log('✅ Application stopped successfully!');
  }
}

async function main() {
  try {
    // Load configuration from CSV or JSON
    const csvPath = process.env.URLS_CSV_PATH || './urls.csv';
    const jsonPath = process.env.CONFIG_JSON_PATH || './config.json';
    
    console.log('📋 Loading configuration...');
    const config = await ConfigLoader.loadConfig(csvPath, jsonPath);
    
    console.log(`📋 Loaded configuration with ${config.urls.length} URLs:`);
    config.urls.forEach(url => {
      const countryInfo = url.countryCode ? ` (countryCode: ${url.countryCode})` : '';
      console.log(`  - ${url.name}: ${url.url}${countryInfo}`);
    });

    // Create and start application
    const app = new Application(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      app.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      app.stop();
      process.exit(0);
    });

    // Start the application
    app.start();
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
main();
