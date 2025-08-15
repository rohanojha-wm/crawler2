export interface URLConfig {
    url: string;
    name: string;
    countryCode?: string;
    group_name?: string;
    interval?: number;
}

export interface MonitorConfig {
    urls: URLConfig[];
    defaultInterval: number;
    timeout?: number;
    userAgent?: string;
}

export interface RequestResult {
    id?: number;
    url: string;
    name: string;
    countryCode?: string;
    group_name?: string;
    timestamp: string;
    status: number;
    responseTime: number;
    success: boolean;
    error?: string;
}

export interface GroupHierarchy {
    group_name: string;
    countryCode?: string;
    urls: Array<{
        url: string;
        name: string;
    }>;
}

export interface URLStats {
    url: string;
    name: string;
    group_name?: string;
    countryCode?: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    lastChecked?: string;
    lastStatus?: number;
}