import axios, { AxiosResponse } from 'axios';
import { UrlConfig, RequestResult, MonitoringConfig } from './types';
import { Database } from './database';
import { SlackNotifier } from './slack-notifier';

export class UrlMonitor {
  private readonly config: MonitoringConfig;
  private readonly database: Database;
  private readonly slackNotifier: SlackNotifier;
  private readonly intervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly failureTracker: Map<string, number> = new Map(); // Track consecutive failures per URL
  private readonly notifiedUrls: Set<string> = new Set(); // Track which URLs have been notified

  constructor(config: MonitoringConfig, database: Database) {
    this.config = config;
    this.database = database;
    this.slackNotifier = new SlackNotifier();
  }

  async checkUrl(urlConfig: UrlConfig): Promise<RequestResult> {
    const startTime = Date.now();
    let result: RequestResult;

    try {
      // Prepare request headers and cookies
      const headers: any = {
        'User-Agent': 'URL-Monitor/1.0'
      };

      // Add country code as cookie if provided
      if (urlConfig.countryCode) {
        headers['Cookie'] = `countryCode=${urlConfig.countryCode}`;
      }

      const response: AxiosResponse = await axios.get(urlConfig.url, {
        timeout: this.config.timeout,
        validateStatus: () => true, // Don't throw on 4xx/5xx status codes
        headers
      });

      const responseTime = Date.now() - startTime;
      
      result = {
        url: urlConfig.url,
        name: urlConfig.name,
        group: urlConfig.group,
        timestamp: new Date().toISOString(),
        status: response.status,
        responseTime,
        success: response.status >= 200 && response.status < 400
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      result = {
        url: urlConfig.url,
        name: urlConfig.name,
        group: urlConfig.group,
        timestamp: new Date().toISOString(),
        status: 0,
        responseTime,
        success: false,
        error: error.message
      };
    }

    // Save to database
    try {
      await this.database.saveResult(result);
    } catch (error) {
      console.error('Error saving result to database:', error);
    }

    // Track consecutive failures and send Slack notifications
    await this.handleFailureTracking(result, urlConfig);

    return result;
  }

  startMonitoring(): void {
    console.log('Starting URL monitoring...');
    
    // Initial check for all URLs
    this.config.urls.forEach(urlConfig => {
      this.checkUrl(urlConfig).then(result => {
        console.log(`Initial check for ${result.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.responseTime}ms)`);
      });
    });

    // Set up periodic checking for all URLs using the same interval
    const intervalId = setInterval(async () => {
      console.log(`\n📊 Running monitoring cycle at ${new Date().toISOString()}`);
      
      // Check all URLs in parallel
      const promises = this.config.urls.map(async (urlConfig) => {
        try {
          const result = await this.checkUrl(urlConfig);
          console.log(`${result.name}: ${result.success ? '✅' : '❌'} ${result.status} (${result.responseTime}ms)`);
          return result;
        } catch (error) {
          console.error(`Error monitoring ${urlConfig.name}:`, error);
          return null;
        }
      });

      await Promise.all(promises);
    }, this.config.defaultInterval);

    this.intervals.set('main', intervalId);
  }

  stopMonitoring(): void {
    console.log('Stopping URL monitoring...');
    
    this.intervals.forEach((intervalId, name) => {
      clearInterval(intervalId);
      console.log(`Stopped monitoring ${name}`);
    });
    
    this.intervals.clear();
  }

  async getMonitoringStats(): Promise<any> {
    return await this.database.getStats();
  }

  async getRecentResults(timeRange: string = '-1 hour'): Promise<RequestResult[]> {
    return await this.database.getResults(timeRange);
  }

  private async handleFailureTracking(result: RequestResult, urlConfig: UrlConfig): Promise<void> {
    const urlKey = result.url;
    
    if (result.success) {
      // URL is back online - check if we need to send recovery notification
      if (this.notifiedUrls.has(urlKey)) {
        await this.slackNotifier.sendRecoveryAlert({
          url: result.url,
          name: result.name,
          consecutiveFailures: 0,
          groupName: result.group
        });
        this.notifiedUrls.delete(urlKey);
      }
      
      // Reset failure count on success
      this.failureTracker.delete(urlKey);
    } else {
      // URL failed - increment failure count
      const currentFailures = this.failureTracker.get(urlKey) || 0;
      const newFailureCount = currentFailures + 1;
      this.failureTracker.set(urlKey, newFailureCount);
      
      // Send Slack notification if we hit the threshold (3+ consecutive failures)
      // and haven't already notified for this URL
      if (newFailureCount >= 3 && !this.notifiedUrls.has(urlKey)) {
        await this.slackNotifier.sendFailureAlert({
          url: result.url,
          name: result.name,
          consecutiveFailures: newFailureCount,
          lastError: result.error,
          groupName: result.group
        });
        this.notifiedUrls.add(urlKey);
      }
      
      // Log failure count for debugging
      console.log(`❌ ${result.name}: ${newFailureCount} consecutive failure(s)`);
    }
  }
}
