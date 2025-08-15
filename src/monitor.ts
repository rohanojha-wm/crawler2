import { URLConfig, RequestResult } from './types';
import { Database } from './database';

export class Monitor {
    private database: Database;
    private timeout: number;
    private isRunning: boolean = false;
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    constructor(database: Database, timeout: number = 30000) {
        this.database = database;
        this.timeout = timeout;
    }

    async start(urls: URLConfig[]): Promise<void> {
        if (this.isRunning) {
            throw new Error('Monitor is already running');
        }

        this.isRunning = true;
        console.log(`Starting monitor for ${urls.length} URLs`);

        // Start monitoring each URL with its individual interval
        for (const url of urls) {
            this.scheduleURL(url);
        }
    }

    private scheduleURL(config: URLConfig): void {
        const interval = config.interval || 60000; // Default 1 minute
        
        // Initial check
        this.checkURL(config);
        
        // Schedule periodic checks
        const intervalId = setInterval(() => {
            this.checkURL(config);
        }, interval);
        
        this.intervals.set(config.url, intervalId);
        console.log(`Scheduled ${config.name} (${config.url}) every ${interval}ms`);
    }

    private async checkURL(config: URLConfig): Promise<void> {
        const startTime = Date.now();
        let result: RequestResult;

        try {
            const headers: Record<string, string> = {
                'User-Agent': 'URL-Monitor/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            };

            // Add country-specific headers if countryCode is provided
            if (config.countryCode) {
                headers['Accept-Language'] = this.getAcceptLanguage(config.countryCode);
                // Add country-specific cookies if needed
                const countryCookie = this.getCountryCookie(config.countryCode);
                if (countryCookie) {
                    headers['Cookie'] = countryCookie;
                }
            }

            const response = await fetch(config.url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(this.timeout)
            });

            const responseTime = Date.now() - startTime;
            const success = response.ok;

            result = {
                url: config.url,
                name: config.name,
                countryCode: config.countryCode,
                group_name: config.group_name,
                timestamp: new Date().toISOString(),
                status: response.status,
                responseTime,
                success,
                error: success ? undefined : `HTTP ${response.status}`
            };

            console.log(`✓ ${config.name}: ${response.status} (${responseTime}ms)`);

        } catch (error: any) {
            const responseTime = Date.now() - startTime;
            
            result = {
                url: config.url,
                name: config.name,
                countryCode: config.countryCode,
                group_name: config.group_name,
                timestamp: new Date().toISOString(),
                status: 0,
                responseTime,
                success: false,
                error: error.message || 'Request failed'
            };

            console.log(`✗ ${config.name}: ${error.message} (${responseTime}ms)`);
        }

        await this.database.insertResult(result);
    }

    private getAcceptLanguage(countryCode: string): string {
        const languageMap: Record<string, string> = {
            'US': 'en-US,en;q=0.9',
            'GB': 'en-GB,en;q=0.9',
            'CA': 'en-CA,en;q=0.9,fr-CA;q=0.8',
            'AU': 'en-AU,en;q=0.9',
            'DE': 'de-DE,de;q=0.9,en;q=0.8',
            'FR': 'fr-FR,fr;q=0.9,en;q=0.8',
            'ES': 'es-ES,es;q=0.9,en;q=0.8',
            'IT': 'it-IT,it;q=0.9,en;q=0.8',
            'BR': 'pt-BR,pt;q=0.9,en;q=0.8',
            'JP': 'ja-JP,ja;q=0.9,en;q=0.8',
            'KR': 'ko-KR,ko;q=0.9,en;q=0.8'
        };
        return languageMap[countryCode] || 'en-US,en;q=0.9';
    }

    private getCountryCookie(countryCode: string): string | null {
        const cookieMap: Record<string, string> = {
            'US': 'country=US; region=NA',
            'GB': 'country=GB; region=EU',
            'CA': 'country=CA; region=NA',
            'AU': 'country=AU; region=APAC',
            'DE': 'country=DE; region=EU',
            'FR': 'country=FR; region=EU'
        };
        return cookieMap[countryCode] || null;
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('Stopping monitor...');
        this.isRunning = false;

        // Clear all intervals
        for (const [url, intervalId] of this.intervals.entries()) {
            clearInterval(intervalId);
            console.log(`Stopped monitoring: ${url}`);
        }
        
        this.intervals.clear();
        console.log('Monitor stopped');
    }

    isMonitorRunning(): boolean {
        return this.isRunning;
    }

    getMonitoredURLs(): string[] {
        return Array.from(this.intervals.keys());
    }
}