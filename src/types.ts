export interface UrlConfig {
  url: string;
  name: string;
  interval: number; // in milliseconds
  countryCode?: string; // optional country code for cookie
  group?: string; // optional group for organizing URLs
}

export interface RequestResult {
  id?: number;
  url: string;
  name: string;
  group?: string;
  timestamp: string;
  status: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

export interface MonitoringConfig {
  urls: UrlConfig[];
  defaultInterval: number;
  retryAttempts: number;
  timeout: number;
}
