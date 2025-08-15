import { Database } from './database';
import { Monitor } from './monitor';
import { WebServer } from './webserver';
import { ConfigLoader } from './config-loader';
import { MonitorConfig } from './types';

class Application {
    private database: Database;
    private monitor: Monitor;
    private webServer: WebServer;
    private isShuttingDown: boolean = false;

    constructor() {
        this.database = new Database();
        this.monitor = new Monitor(this.database);
        this.webServer = new WebServer(this.database, 3000);
    }

    async start(): Promise<void> {
        try {
            console.log('🚀 Starting URL Monitor Application...');

            // Initialize database with proper schema
            await this.database.initialize();
            console.log('✅ Database initialized with monitoring schema');

            // Load configuration from CSV (recommended) or JSON (legacy)
            const config = await this.loadConfiguration();
            console.log(`✅ Configuration loaded: ${config.urls.length} URLs to monitor`);

            // Start web server with all API endpoints
            await this.webServer.start();
            console.log('✅ Web server started with dashboard and API endpoints');

            // Start periodic URL monitoring
            await this.monitor.start(config.urls);
            console.log('✅ URL monitoring started with configurable intervals');

            // Setup graceful shutdown handling
            this.setupGracefulShutdown();

            console.log('🎉 Application started successfully!');
            console.log('📊 Dashboard: http://localhost:3000');
            console.log('🔗 Test API: http://localhost:3000/api/group-hierarchy');

        } catch (error: any) {
            console.error('❌ Failed to start application:', error.message);
            process.exit(1);
        }
    }

    private async loadConfiguration(): Promise<MonitorConfig> {
        const csvPath = process.env.URLS_CSV_PATH || 'urls.csv';
        const jsonPath = 'config.json';

        try {
            // CSV-based configuration (recommended approach)
            console.log(`Loading configuration from CSV: ${csvPath}`);
            return await ConfigLoader.loadFromCSV(csvPath, {
                defaultInterval: parseInt(process.env.CHECK_INTERVAL || '60000'),
                timeout: parseInt(process.env.MONITOR_TIMEOUT || '30000')
            });
        } catch (csvError) {
            console.warn(`CSV loading failed: ${csvError}. Trying JSON fallback...`);
            
            try {
                // JSON configuration (legacy support)
                console.log(`Loading configuration from JSON: ${jsonPath}`);
                return await ConfigLoader.loadFromJSON(jsonPath);
            } catch (jsonError) {
                throw new Error(`Failed to load configuration from both CSV and JSON: ${csvError}, ${jsonError}`);
            }
        }
    }

    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string) => {
            if (this.isShuttingDown) {
                console.log('Force shutdown...');
                process.exit(1);
            }

            this.isShuttingDown = true;
            console.log(`\n🛑 Received ${signal}. Graceful shutdown initiated...`);

            try {
                // Stop URL monitoring first
                await this.monitor.stop();
                console.log('✅ URL monitor stopped');

                // Stop web server and API endpoints
                await this.webServer.stop();
                console.log('✅ Web server stopped');

                // Close database connections
                await this.database.close();
                console.log('✅ Database connections closed');

                console.log('👋 Graceful shutdown completed');
                process.exit(0);
            } catch (error: any) {
                console.error('❌ Error during shutdown:', error.message);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    }
}

// Start application if this file is run directly
if (require.main === module) {
    const app = new Application();
    app.start().catch((error) => {
        console.error('Failed to start application:', error);
        process.exit(1);
    });
}

export { Application };