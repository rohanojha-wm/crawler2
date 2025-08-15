import fs from 'fs';
import csv from 'csv-parser';
import { URLConfig, MonitorConfig } from './types';

export class ConfigLoader {
    static async loadFromCSV(csvPath: string, defaultConfig?: Partial<MonitorConfig>): Promise<MonitorConfig> {
        const urls: URLConfig[] = [];

        return new Promise((resolve, reject) => {
            if (!fs.existsSync(csvPath)) {
                reject(new Error(`CSV file not found: ${csvPath}`));
                return;
            }

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row: any) => {
                    try {
                        const url: URLConfig = {
                            url: row.url?.trim(),
                            name: row.name?.trim() || row.url?.trim(),
                            countryCode: row.countryCode?.trim() || undefined,
                            group_name: row.group?.trim() || undefined,
                            interval: parseInt(row.interval) || defaultConfig?.defaultInterval || 60000
                        };

                        // Validate URL
                        if (!url.url?.startsWith('http')) {
                            console.warn(`Skipping invalid URL: ${row.url}`);
                            return;
                        }

                        urls.push(url);
                    } catch (error) {
                        console.warn(`Error parsing row:`, error);
                    }
                })
                .on('end', () => {
                    const config: MonitorConfig = {
                        urls,
                        defaultInterval: defaultConfig?.defaultInterval || 60000,
                        timeout: defaultConfig?.timeout || 30000,
                        userAgent: defaultConfig?.userAgent || 'URL-Monitor/1.0'
                    };
                    resolve(config);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    static async loadFromJSON(jsonPath: string): Promise<MonitorConfig> {
        try {
            if (!fs.existsSync(jsonPath)) {
                throw new Error(`JSON file not found: ${jsonPath}`);
            }

            const content = await fs.promises.readFile(jsonPath, 'utf-8');
            const config = JSON.parse(content) as MonitorConfig;
            
            // Validate URLs
            config.urls = config.urls.filter(url => {
                if (!url.url?.startsWith('http')) {
                    console.warn(`Skipping invalid URL: ${url.url}`);
                    return false;
                }
                return true;
            });

            return config;
        } catch (error) {
            throw new Error(`Failed to load JSON config: ${error}`);
        }
    }
}