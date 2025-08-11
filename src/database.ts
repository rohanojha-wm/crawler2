
import sqlite3 from 'sqlite3';
import { RequestResult } from './types';

export class Database {
  // Returns: [{ group_name, countryCode, urls: [UrlConfig] }]
  async getGroupHierarchy(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COALESCE(group_name, 'Ungrouped') as group_name,
          COALESCE(countryCode, 'Unknown') as countryCode,
          name, url
        FROM requests
        GROUP BY group_name, countryCode, name, url
        ORDER BY group_name, countryCode, name
      `;
      this.db.all(query, [], (err: any, rows: any[]) => {
        if (err) return reject(new Error(err));
        // Build hierarchy: group -> countryCode -> urls[]
        const result: any = {};
        for (const row of rows) {
          if (!result[row.group_name]) result[row.group_name] = {};
          if (!result[row.group_name][row.countryCode]) result[row.group_name][row.countryCode] = [];
          result[row.group_name][row.countryCode].push({ name: row.name, url: row.url });
        }
        // Convert to array
        const hierarchy: any[] = [];
        for (const group_name of Object.keys(result)) {
          for (const countryCode of Object.keys(result[group_name])) {
            hierarchy.push({
              group_name,
              countryCode,
              urls: result[group_name][countryCode]
            });
          }
        }
        resolve(hierarchy);
      });
    });
  }
  private readonly db: sqlite3.Database;

  constructor(dbPath: string = './monitoring.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTable = `
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            name TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            status INTEGER NOT NULL,
            responseTime INTEGER NOT NULL,
            success BOOLEAN NOT NULL,
            error TEXT,
            group_name TEXT
        )
    `;

    this.db.run(createTable, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Database initialized successfully');
        
        // Try to add group_name column if it doesn't exist (for existing databases)
        this.db.run(`ALTER TABLE requests ADD COLUMN group_name TEXT`, (alterErr) => {
          // Ignore error if column already exists
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            console.log('Note: Could not add group_name column (may already exist)');
          }
        });
      }
    });
  }

  async saveResult(result: RequestResult): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO requests (url, name, group_name, timestamp, status, responseTime, success, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [result.url, result.name, result.group, result.timestamp, result.status, result.responseTime, result.success, result.error],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }


  async getResults(timeRange?: string, urlName?: string, groupName?: string): Promise<RequestResult[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM requests';
      const params: any[] = [];

      const conditions: string[] = [];

      if (timeRange) {
        conditions.push('timestamp >= datetime("now", ?)');
        params.push(timeRange);
      }

      if (urlName) {
        conditions.push('name = ?');
        params.push(urlName);
      }

      if (groupName) {
        conditions.push('group_name = ?');
        params.push(groupName);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC';

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as RequestResult[]);
        }
      });
    });
  }

  async getStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          name,
          group_name,
          COUNT(*) as total_requests,
          AVG(responseTime) as avg_response_time,
          AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
          MAX(timestamp) as last_check
        FROM requests 
        GROUP BY name, group_name
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getGroupStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COALESCE(group_name, 'Ungrouped') as group_name,
          COUNT(DISTINCT name) as url_count,
          COUNT(*) as total_requests,
          AVG(responseTime) as avg_response_time,
          AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
          MAX(timestamp) as last_check
        FROM requests 
        GROUP BY group_name
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getStatusCodeStats(timeRange?: string, groupName?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          COALESCE(group_name, 'Ungrouped') as group_name,
          name,
          status,
          COUNT(*) as count,
          datetime(timestamp) as timestamp
        FROM requests
      `;

      const params: any[] = [];
      const conditions: string[] = [];
      
      if (timeRange) {
        conditions.push('timestamp >= datetime("now", ?)');
        params.push(timeRange);
      }

      if (groupName) {
        conditions.push('group_name = ?');
        params.push(groupName);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY group_name, name, status ORDER BY timestamp DESC';

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getUrlsByGroup(groupName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          name,
          url,
          COUNT(*) as total_requests,
          AVG(responseTime) as avg_response_time,
          AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
          MAX(timestamp) as last_check
        FROM requests 
        WHERE group_name = ?
        GROUP BY name, url
      `;

      this.db.all(query, [groupName], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getFailedRequests(timeRange?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          id,
          url,
          name,
          COALESCE(group_name, 'Ungrouped') as group_name,
          timestamp,
          status,
          responseTime,
          error
        FROM requests 
        WHERE success = 0
      `;

      const params: any[] = [];
      if (timeRange) {
        query += ' AND timestamp >= datetime("now", ?)';
        params.push(timeRange);
      }

      query += ' ORDER BY timestamp DESC';

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
