import fs from 'fs/promises';
import path from 'path';
import { Database } from './database';
import { Monitor } from './monitor';
import { ConfigLoader } from './config-loader';
import { MonitorConfig } from './types';

class HeadlessApplication {
    private database: Database;
    private monitor: Monitor;

    constructor() {
        this.database = new Database();
        this.monitor = new Monitor(this.database);
    }

    async run(): Promise<void> {
        try {
            console.log('🤖 Starting Headless URL Monitor...');

            // Initialize database
            await this.database.initialize();
            console.log('✅ Database initialized');

            // Load configuration
            const config = await this.loadConfiguration();
            console.log(`✅ Configuration loaded: ${config.urls.length} URLs`);

            // Run single check cycle
            await this.runSingleCycle(config);

            // Generate static files for GitHub Pages
            await this.generateStaticFiles();

            // Cleanup old data
            await this.cleanupOldData();

            console.log('🎉 Headless run completed successfully!');

        } catch (error: any) {
            console.error('❌ Headless run failed:', error.message);
            process.exit(1);
        } finally {
            await this.database.close();
        }
    }

    private async loadConfiguration(): Promise<MonitorConfig> {
        const csvPath = process.env.URLS_CSV_PATH || 'urls.csv';
        const jsonPath = 'config.json';

        try {
            return await ConfigLoader.loadFromCSV(csvPath, {
                defaultInterval: 60000, // Single check, interval doesn't matter
                timeout: parseInt(process.env.MONITOR_TIMEOUT || '30000')
            });
        } catch (csvError) {
            console.warn(`CSV loading failed: ${csvError}. Trying JSON...`);
            
            try {
                return await ConfigLoader.loadFromJSON(jsonPath);
            } catch (jsonError) {
                throw new Error(`Failed to load configuration: ${csvError}, ${jsonError}`);
            }
        }
    }

    private async runSingleCycle(config: MonitorConfig): Promise<void> {
        console.log('🔄 Running single monitoring cycle...');
        
        const promises = config.urls.map(async (urlConfig) => {
            try {
                console.log(`Checking: ${urlConfig.name} (${urlConfig.url})`);
                
                const startTime = Date.now();
                const response = await fetch(urlConfig.url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'URL-Monitor/1.0',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    signal: AbortSignal.timeout(config.timeout || 30000)
                });

                const responseTime = Date.now() - startTime;
                const success = response.ok;

                await this.database.insertResult({
                    url: urlConfig.url,
                    name: urlConfig.name,
                    countryCode: urlConfig.countryCode,
                    group_name: urlConfig.group_name,
                    timestamp: new Date().toISOString(),
                    status: response.status,
                    responseTime,
                    success,
                    error: success ? undefined : `HTTP ${response.status}`
                });

                console.log(`✅ ${urlConfig.name}: ${response.status} (${responseTime}ms)`);

            } catch (error: any) {
                const responseTime = Date.now() - Date.now();
                
                await this.database.insertResult({
                    url: urlConfig.url,
                    name: urlConfig.name,
                    countryCode: urlConfig.countryCode,
                    group_name: urlConfig.group_name,
                    timestamp: new Date().toISOString(),
                    status: 0,
                    responseTime,
                    success: false,
                    error: error.message || 'Request failed'
                });

                console.log(`❌ ${urlConfig.name}: ${error.message}`);
            }
        });

        await Promise.all(promises);
        console.log('✅ Monitoring cycle completed');
    }

    private async generateStaticFiles(): Promise<void> {
        try {
            console.log('📄 Generating static files for GitHub Pages...');

            // Ensure public/api directory exists
            const apiDir = path.join('public', 'api');
            await fs.mkdir(apiDir, { recursive: true });

            // Generate results.json
            const results = await this.database.getResults('-7 days');
            await fs.writeFile(
                path.join(apiDir, 'results.json'),
                JSON.stringify(results, null, 2)
            );

            // Generate group-hierarchy.json
            const hierarchy = await this.database.getGroupHierarchy();
            await fs.writeFile(
                path.join(apiDir, 'group-hierarchy.json'),
                JSON.stringify(hierarchy, null, 2)
            );

            // Generate stats.json
            const stats = await this.database.getStats('-24 hours');
            await fs.writeFile(
                path.join(apiDir, 'stats.json'),
                JSON.stringify(stats, null, 2)
            );

            console.log('✅ Static files generated');
            console.log(`   - Results: ${results.length} entries`);
            console.log(`   - Groups: ${hierarchy.length} groups`);
            console.log(`   - Stats: ${stats.length} URLs`);

        } catch (error: any) {
            console.error('❌ Failed to generate static files:', error.message);
            throw error;
        }
    }

    private async cleanupOldData(): Promise<void> {
        try {
            const cleanupDays = parseInt(process.env.CLEANUP_DAYS || '30');
            const deletedRows = await this.database.cleanup(cleanupDays);
            
            if (deletedRows > 0) {
                console.log(`🧹 Cleaned up ${deletedRows} old records (older than ${cleanupDays} days)`);
            }
        } catch (error: any) {
            console.warn('⚠️ Cleanup failed:', error.message);
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    const app = new HeadlessApplication();
    app.run().catch((error) => {
        console.error('Headless application failed:', error);
        process.exit(1);
    });
}

export { HeadlessApplication };