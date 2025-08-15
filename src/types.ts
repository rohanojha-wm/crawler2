export interface URLConfig {
    url: string;
    name: string;
    countryCode?: string | undefined;
    group_name?: string | undefined;
    interval?: number | undefined;
}

export interface MonitorConfig {
    urls: URLConfig[];
    defaultInterval: number;
    timeout?: number | undefined;
    userAgent?: string | undefined;
}

export interface RequestResult {
    id?: number | undefined;
    url: string;
    name: string;
    countryCode?: string | undefined;
    group_name?: string | undefined;
    timestamp: string;
    status: number;
    responseTime: number;
    success: boolean;
    error?: string | undefined;
}

export interface GroupHierarchy {
    group_name: string;
    countryCode?: string | undefined;
    urls: Array<{
        url: string;
        name: string;
    }>;
}

export interface URLStats {
    url: string;
    name: string;
    group_name?: string | undefined;
    countryCode?: string | undefined;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    lastChecked?: string | undefined;
    lastStatus?: number | undefined;
}