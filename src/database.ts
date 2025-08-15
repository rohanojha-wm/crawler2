import sqlite3 from 'sqlite3';
import { open, Database as SqliteDatabase } from 'sqlite';
import { RequestResult, GroupHierarchy, URLStats } from './types';

export class Database {
    private db!: SqliteDatabase<sqlite3.Database, sqlite3.Statement>;

    async initialize(dbPath: string = 'monitor.db'): Promise<void> {
        try {
            console.log(`Initializing database: ${dbPath}`);
            this.db = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });

            // Create main requests table following your schema: id, url, name, timestamp, status, responseTime, success, error
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    name TEXT NOT NULL,
                    countryCode TEXT,
                    group_name TEXT,
                    timestamp TEXT NOT NULL,
                    status INTEGER NOT NULL,
                    responseTime INTEGER NOT NULL,
                    success BOOLEAN NOT NULL,
                    error TEXT
                )
            `);

            // Create indexes for better query performance
            await this.db.exec(`
                CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
                CREATE INDEX IF NOT EXISTS idx_requests_url ON requests(url);
                CREATE INDEX IF NOT EXISTS idx_requests_group_name ON requests(group_name);
                CREATE INDEX IF NOT EXISTS idx_requests_country ON requests(countryCode);
            `);

            console.log(`✅ Database initialized successfully: ${dbPath}`);
        } catch (error: any) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    async insertResult(result: RequestResult): Promise<void> {
        try {
            await this.db.run(
                `INSERT INTO requests (url, name, countryCode, group_name, timestamp, status, responseTime, success, error)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    result.url,
                    result.name,
                    result.countryCode || null,
                    result.group_name || null,
                    result.timestamp,
                    result.status,
                    result.responseTime,
                    result.success ? 1 : 0,
                    result.error || null
                ]
            );
        } catch (error: any) {
            console.error('Error inserting monitoring result:', error.message);
            throw error;
        }
    }

    async getResults(timeRange: string = '-24 hours', groupName?: string): Promise<RequestResult[]> {
        try {
            let query = `
                SELECT id, url, name, countryCode, group_name, timestamp, status, responseTime, success, error
                FROM requests 
                WHERE datetime(timestamp) >= datetime('now', ?)
            `;
            const params: any[] = [timeRange];

            if (groupName) {
                query += ' AND group_name = ?';
                params.push(groupName);
            }

            query += ' ORDER BY timestamp DESC';

            const rows = await this.db.all(query, params);
            return rows.map(row => ({
                ...row,
                success: Boolean(row.success)
            }));
        } catch (error: any) {
            console.error('Error retrieving monitoring results:', error.message);
            throw error;
        }
    }

    async getGroupHierarchy(): Promise<GroupHierarchy[]> {
        try {
            console.log('Building group hierarchy from database...');
            
            // Get distinct group/country/url combinations for dashboard drilldown
            const rows = await this.db.all(`
                SELECT DISTINCT group_name, countryCode, url, name
                FROM requests
                WHERE group_name IS NOT NULL 
                  AND group_name != ''
                  AND url IS NOT NULL
                  AND name IS NOT NULL
                ORDER BY group_name, countryCode, name
            `);

            console.log(`Found ${rows.length} group/country/url combinations in database`);

            if (rows.length === 0) {
                console.warn('No group hierarchy data found. Ensure URLs have group_name values.');
                
                // Debug: Check what data we have
                const totalRows = await this.db.get('SELECT COUNT(*) as count FROM requests');
                console.log(`Total requests in database: ${totalRows?.count || 0}`);
                
                const sampleRows = await this.db.all('SELECT url, name, group_name, countryCode FROM requests LIMIT 5');
                console.log('Sample data:', sampleRows);
                
                return [];
            }

            // Build hierarchy map for dashboard drilldown functionality
            const hierarchyMap = new Map<string, GroupHierarchy>();
            
            rows.forEach(row => {
                const key = `${row.group_name}|${row.countryCode || 'no-country'}`;
                
                if (!hierarchyMap.has(key)) {
                    hierarchyMap.set(key, {
                        group_name: row.group_name,
                        countryCode: row.countryCode || undefined,
                        urls: []
                    });
                }
                
                const entry = hierarchyMap.get(key)!;
                
                // Avoid duplicate URLs in the same group/country
                if (!entry.urls.find(u => u.url === row.url)) {
                    entry.urls.push({
                        url: row.url,
                        name: row.name
                    });
                }
            });

            const result = Array.from(hierarchyMap.values());
            const totalUrls = result.reduce((sum, g) => sum + g.urls.length, 0);
            
            console.log(`Built group hierarchy: ${result.length} groups containing ${totalUrls} URLs total`);
            
            return result;
        } catch (error: any) {
            console.error('Error building group hierarchy:', error.message);
            throw error;
        }
    }

    async getStats(timeRange: string = '-24 hours'): Promise<URLStats[]> {
        try {
            const rows = await this.db.all(`
                SELECT 
                    url,
                    name,
                    group_name,
                    countryCode,
                    COUNT(*) as totalRequests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successfulRequests,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failedRequests,
                    AVG(responseTime) as averageResponseTime,
                    MAX(timestamp) as lastChecked,
                    (SELECT status FROM requests r2 WHERE r2.url = requests.url ORDER BY timestamp DESC LIMIT 1) as lastStatus
                FROM requests 
                WHERE datetime(timestamp) >= datetime('now', ?)
                GROUP BY url, name, group_name, countryCode
                ORDER BY name
            `, [timeRange]);

            return rows.map(row => ({
                url: row.url,
                name: row.name,
                group_name: row.group_name,
                countryCode: row.countryCode,
                totalRequests: row.totalRequests,
                successfulRequests: row.successfulRequests,
                failedRequests: row.failedRequests,
                successRate: row.totalRequests > 0 ? (row.successfulRequests / row.totalRequests) * 100 : 0,
                averageResponseTime: Math.round(row.averageResponseTime || 0),
                lastChecked: row.lastChecked,
                lastStatus: row.lastStatus
            }));
        } catch (error: any) {
            console.error('Error calculating URL statistics:', error.message);
            throw error;
        }
    }

    async cleanup(olderThanDays: number = 30): Promise<number> {
        try {
            const result = await this.db.run(
                'DELETE FROM requests WHERE datetime(timestamp) < datetime("now", "-" || ? || " days")',
                [olderThanDays]
            );
            return result.changes || 0;
        } catch (error: any) {
            console.error('Error during database cleanup:', error.message);
            throw error;
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            await this.db.close();
            console.log('Database connection closed');
        }
    }
}