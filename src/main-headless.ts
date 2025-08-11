import { MonitoringConfig } from './types';
import { Database } from './database';
import { UrlMonitor } from './monitor';
import { WebServer } from './webserver';
import { ConfigLoader } from './config-loader';

class Application {
  private readonly database: Database;
  private readonly monitor: UrlMonitor;
  private readonly webServer?: WebServer;
  private readonly isHeadless: boolean;

  constructor(config: MonitoringConfig, headless: boolean = false) {
    this.database = new Database();
    this.monitor = new UrlMonitor(config, this.database);
    this.isHeadless = headless;
    
    // Only create web server if not in headless mode
    if (!headless) {
      this.webServer = new WebServer(this.database);
    }
  }

  start(): void {
    console.log('🚀 Starting URL Monitor Application...');
    
    // Start monitoring URLs
    this.monitor.startMonitoring();
    
    // Start web dashboard only if not headless
    if (this.webServer && !this.isHeadless) {
      this.webServer.start(3000);
      console.log('📊 Dashboard: http://localhost:3000');
    } else {
      console.log('🤖 Running in headless mode (no web dashboard)');
    }
    
    console.log('✅ Application started successfully!');
    console.log('🔍 Monitoring URLs...');
  }

  stop(): void {
    console.log('🛑 Stopping URL Monitor Application...');
    
    this.monitor.stopMonitoring();
    
    if (this.webServer) {
      this.webServer.stop();
    }
    
    this.database.close();
    
    console.log('✅ Application stopped successfully!');
  }

  async getStats(): Promise<any> {
    return await this.monitor.getMonitoringStats();
  }
}

async function main() {
  try {
    // Check if running in CI/headless mode
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'production';
    const isHeadless = process.env.HEADLESS === 'true' || isCI;
    
    // Load configuration from CSV or JSON
    const csvPath = process.env.URLS_CSV_PATH || './urls.csv';
    const jsonPath = process.env.CONFIG_JSON_PATH || './config.json';
    const checkInterval = parseInt(process.env.CHECK_INTERVAL || '60000'); // Default 60 seconds
    
    console.log('📋 Loading configuration...');
    const config = await ConfigLoader.loadConfig(csvPath, jsonPath);
    
    // Override the default interval with environment variable
    config.defaultInterval = checkInterval;
    
    console.log(`📋 Loaded configuration with ${config.urls.length} URLs:`);
    console.log(`⏱️  Check interval: ${checkInterval/1000} seconds`);
    config.urls.forEach(url => {
      const countryInfo = url.countryCode ? ` (countryCode: ${url.countryCode})` : '';
      console.log(`  - ${url.name}: ${url.url}${countryInfo}`);
    });

    // Create and start application
    const app = new Application(config, isHeadless);

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\n🛑 Shutting down gracefully...');
      app.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // For CI environments, also handle timeout
    if (isCI) {
      const timeout = parseInt(process.env.MONITOR_TIMEOUT || '300') * 1000; // Default 5 minutes
      setTimeout(() => {
        console.log(`⏰ Timeout reached (${timeout/1000}s), shutting down...`);
        shutdown();
      }, timeout);
    }

    // Start the application
    app.start();
    
    // In headless mode, log stats periodically
    if (isHeadless) {
      setInterval(async () => {
        try {
          const stats = await app.getStats();
          console.log('\n📊 Current Statistics:');
          stats.forEach((stat: any) => {
            console.log(`  ${stat.name}: ${stat.success_rate.toFixed(1)}% success (${stat.total_requests} requests, ${Math.round(stat.avg_response_time)}ms avg)`);
          });
        } catch (error) {
          console.error('Error getting stats:', error);
        }
      }, 60000); // Log stats every minute
    }
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
main();
