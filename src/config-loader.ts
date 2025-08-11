import fs from 'fs';
import csv from 'csv-parser';
import { UrlConfig, MonitoringConfig } from './types';

export class ConfigLoader {
  static async loadFromCSV(csvPath: string, defaultConfig?: Partial<MonitoringConfig>): Promise<MonitoringConfig> {
    const urls: UrlConfig[] = [];
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(csvPath)) {
        reject(new Error(`CSV file not found: ${csvPath}`));
        return;
      }

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            const url: UrlConfig = {
              url: row.url?.trim(),
              name: row.name?.trim() || row.url?.trim(),
              interval: defaultConfig?.defaultInterval || 60000, // Use default interval for all URLs
              countryCode: row.countryCode?.trim() || undefined, // Read country code from CSV
              group: row.group?.trim() || undefined // Read group from CSV
            };

            // Validate URL
            if (!url.url?.startsWith('http')) {
              console.warn(`Skipping invalid URL: ${row.url}`);
              return;
            }

            urls.push(url);
          } catch (error) {
            console.warn(`Error parsing CSV row:`, row, error);
          }
        })
        .on('end', () => {
          const config: MonitoringConfig = {
            urls,
            defaultInterval: defaultConfig?.defaultInterval || 60000,
            retryAttempts: defaultConfig?.retryAttempts || 3,
            timeout: defaultConfig?.timeout || 10000
          };

          console.log(`Loaded ${urls.length} URLs from CSV file: ${csvPath}`);
          resolve(config);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  static async loadFromJSON(jsonPath: string): Promise<MonitoringConfig> {
    try {
      const configData = fs.readFileSync(jsonPath, 'utf8');
      const config = JSON.parse(configData) as MonitoringConfig;
      console.log(`Loaded ${config.urls.length} URLs from JSON file: ${jsonPath}`);
      return config;
    } catch (error) {
      throw new Error(`Error loading JSON config: ${error}`);
    }
  }

  static async loadConfig(csvPath?: string, jsonPath?: string): Promise<MonitoringConfig> {
    // Try CSV first if provided
    if (csvPath && fs.existsSync(csvPath)) {
      return await this.loadFromCSV(csvPath);
    }

    // Fall back to JSON if provided
    if (jsonPath && fs.existsSync(jsonPath)) {
      return await this.loadFromJSON(jsonPath);
    }

    // Default fallback configuration
    console.log('No configuration file found, using default URLs');
    return {
      urls: [
        {
          url: 'https://httpbin.org/status/200',
          name: 'HTTPBin Success',
          interval: 30000
        },
        {
          url: 'https://github.com',
          name: 'GitHub',
          interval: 120000
        }
      ],
      defaultInterval: 60000,
      retryAttempts: 3,
      timeout: 10000
    };
  }
}
