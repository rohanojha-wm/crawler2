import fs from 'fs/promises';
import path from 'path';
import { Database } from './database';
import { ConfigLoader } from './config-loader';
import { MonitorConfig, RequestResult } from './types';

class HeadlessApplication {
    private database: Database;

    constructor() {
        this.database = new Database();
    }

    async run(): Promise<void> {
        try {
            console.log('🤖 Starting Headless URL Monitor...');

             // Initialize SQLite database with consistent naming
            const dbPath = process.env.DATABASE_PATH || 'monitor.db';
            console.log(`Using database file: ${dbPath}`);
            
            await this.database.initialize(dbPath);
            console.log(`✅ Database initialized: ${dbPath}`);

            // Check existing record count for CI/CD tracking
            const existingResults = await this.database.getResults('-30 days');
            console.log(`📊 Existing database records: ${existingResults.length}`);

            // Load configuration from CSV (recommended) or JSON (legacy)
            const config = await this.loadConfiguration();
            console.log(`✅ Configuration loaded: ${config.urls.length} URLs to monitor`);

            // Run single monitoring cycle for all configured URLs
            await this.runSingleCycle(config);

            // Verify new record count after monitoring cycle
            const newResults = await this.database.getResults('-30 days');
            const newRecords = newResults.length - existingResults.length;
            console.log(`📈 Added ${newRecords} new monitoring records`);
            console.log(`📊 Total database records: ${newResults.length}`);

            // Generate static API files for GitHub Pages dashboard
            await this.generateStaticFiles();

            // Cleanup old data to prevent database bloat
            await this.cleanupOldData();

            console.log('🎉 Headless monitoring cycle completed successfully!');

        } catch (error: any) {
            console.error('❌ Headless monitoring failed:', error.message);
            process.exit(1);
        } finally {
            await this.database.close();
        }
    }

    private async loadConfiguration(): Promise<MonitorConfig> {
        const csvPath = process.env.URLS_CSV_PATH || 'urls.csv';
        const jsonPath = 'config.json';

        try {
            // CSV-based configuration (recommended for easy URL management)
            console.log(`Loading configuration from CSV: ${csvPath}`);
            return await ConfigLoader.loadFromCSV(csvPath, {
                defaultInterval: 60000, // Single check, interval doesn't matter
                timeout: parseInt(process.env.MONITOR_TIMEOUT || '30000')
            });
        } catch (csvError) {
            console.warn(`CSV loading failed: ${csvError}. Trying JSON fallback...`);
            
            try {
                // JSON configuration fallback (legacy support)
                return await ConfigLoader.loadFromJSON(jsonPath);
            } catch (jsonError) {
                throw new Error(`Failed to load configuration from both CSV and JSON: ${csvError}, ${jsonError}`);
            }
        }
    }

    private async runSingleCycle(config: MonitorConfig): Promise<void> {
        console.log('🔄 Running single monitoring cycle for all URLs...');
        
        const promises = config.urls.map(async (urlConfig) => {
            try {
                console.log(`Checking: ${urlConfig.name} (${urlConfig.url})`);
                
                const startTime = Date.now();
                
                // Prepare headers for HTTP request (like curl command)
                const headers: Record<string, string> = {
                    'User-Agent': 'URL-Monitor/1.0 (GitHub-Actions)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                };

                // Add country-specific cookies if countryCode is provided
                if (urlConfig.countryCode) {
                    headers['Cookie'] = `country=${urlConfig.countryCode}; region=AUTO`;
                }

                const response = await fetch(urlConfig.url, {
                    method: 'GET',
                    headers,
                    signal: AbortSignal.timeout(config.timeout || 30000)
                });

                const responseTime = Date.now() - startTime;
                const success = response.ok;

                const result: RequestResult = {
                    url: urlConfig.url,
                    name: urlConfig.name,
                    countryCode: urlConfig.countryCode || undefined,
                    group_name: urlConfig.group_name || undefined,
                    timestamp: new Date().toISOString(),
                    status: response.status,
                    responseTime,
                    success,
                    error: success ? undefined : `HTTP ${response.status}`
                };

                await this.database.insertResult(result);
                console.log(`✅ ${urlConfig.name}: ${response.status} (${responseTime}ms)`);

            } catch (error: any) {
                const responseTime = Date.now() - Date.now();
                
                const result: RequestResult = {
                    url: urlConfig.url,
                    name: urlConfig.name,
                    countryCode: urlConfig.countryCode || undefined,
                    group_name: urlConfig.group_name || undefined,
                    timestamp: new Date().toISOString(),
                    status: 0,
                    responseTime,
                    success: false,
                    error: error.message || 'Request failed'
                };

                await this.database.insertResult(result);
                console.log(`❌ ${urlConfig.name}: ${error.message}`);
            }
        });

        await Promise.all(promises);
        console.log('✅ Monitoring cycle completed for all URLs');
    }

    private async generateStaticFiles(): Promise<void> {
        try {
            console.log('📄 Generating static API files for GitHub Pages...');

            // Ensure public/api directory exists for dashboard
            const apiDir = path.join('public', 'api');
            await fs.mkdir(apiDir, { recursive: true });

            // Generate results.json (last 7 days for dashboard)
            const results = await this.database.getResults('-7 days');
            await fs.writeFile(
                path.join(apiDir, 'results.json'),
                JSON.stringify(results, null, 2)
            );

            // Generate group-hierarchy.json for dashboard drilldown
            const hierarchy = await this.database.getGroupHierarchy();
            await fs.writeFile(
                path.join(apiDir, 'group-hierarchy.json'),
                JSON.stringify(hierarchy, null, 2)
            );

            // Generate stats.json for dashboard overview
            const stats = await this.database.getStats('-24 hours');
            await fs.writeFile(
                path.join(apiDir, 'stats.json'),
                JSON.stringify(stats, null, 2)
            );

            console.log('✅ Static API files generated successfully');
            console.log(`   - Results: ${results.length} entries (last 7 days)`);
            console.log(`   - Groups: ${hierarchy.length} group hierarchies`);
            console.log(`   - Stats: ${stats.length} URL statistics (last 24 hours)`);

        } catch (error: any) {
            console.error('❌ Failed to generate static API files:', error.message);
            throw error;
        }
    }

    private async cleanupOldData(): Promise<void> {
        try {
            const cleanupDays = parseInt(process.env.CLEANUP_DAYS || '30');
            const deletedRows = await this.database.cleanup(cleanupDays);
            
            if (deletedRows > 0) {
                console.log(`🧹 Cleaned up ${deletedRows} old monitoring records (older than ${cleanupDays} days)`);
            } else {
                console.log(`🧹 No old records to cleanup (keeping ${cleanupDays} days of data)`);
            }
        } catch (error: any) {
            console.warn('⚠️ Database cleanup failed:', error.message);
        }
    }
}

// Run if this file is executed directly (headless mode for CI/CD)
if (require.main === module) {
    const app = new HeadlessApplication();
    app.run().catch((error) => {
        console.error('Headless application failed:', error);
        process.exit(1);
    });
}

export { HeadlessApplication };