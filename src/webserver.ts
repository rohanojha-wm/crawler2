import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { Database } from './database';

export class WebServer {
    private app: Express;
    private database: Database;
    private port: number;
    private server: any;

    constructor(database: Database, port: number = 3000) {
        this.app = express();
        this.database = database;
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Serve static files from public directory
        this.app.use(express.static(path.join(__dirname, '../public')));
        this.app.use(express.json());
        
        // CORS headers for API requests
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        // Request logging middleware
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req: Request, res: Response) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // API: Get aggregated statistics per monitored URL
        this.app.get('/api/stats', async (req: Request, res: Response) => {
            try {
                const timeRange = (req.query.timeRange as string) || '-24 hours';
                console.log(`Fetching stats with timeRange: ${timeRange}`);
                
                const stats = await this.database.getStats(timeRange);
                console.log(`Retrieved ${stats.length} URL statistics`);
                
                res.json(stats);
            } catch (error: any) {
                console.error('Error fetching stats:', error.message);
                res.status(500).json({ error: 'Failed to fetch stats' });
            }
        });

        // API: Get detailed monitoring results with optional filtering
        this.app.get('/api/results', async (req: Request, res: Response) => {
            try {
                const timeRange = (req.query.timeRange as string) || '-24 hours';
                const groupName = req.query.group as string;
                
                console.log(`Fetching results - timeRange: ${timeRange}, group: ${groupName || 'all'}`);
                const results = await this.database.getResults(timeRange, groupName);
                console.log(`Retrieved ${results.length} monitoring results`);
                
                res.json(results);
            } catch (error: any) {
                console.error('Error fetching results:', error.message);
                res.status(500).json({ error: 'Failed to fetch results' });
            }
        });

        // API: Get group hierarchy for dashboard drilldown
        this.app.get('/api/group-hierarchy', async (req: Request, res: Response) => {
            try {
                console.log('Fetching group hierarchy for dashboard drilldown...');
                const hierarchy = await this.database.getGroupHierarchy();
                console.log(`Retrieved ${hierarchy.length} group hierarchy entries`);
                
                res.json(hierarchy);
            } catch (error: any) {
                console.error('Error fetching group hierarchy:', error.message);
                res.status(500).json({ error: 'Failed to fetch group hierarchy' });
            }
        });

        // Serve dashboard at root
        this.app.get('/', (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // Catch-all for unknown routes (must be last)
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Route not found', path: req.path });
        });
    }

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`🌐 Web server running at http://localhost:${this.port}`);
                console.log(`📊 Dashboard: http://localhost:${this.port}/`);
                console.log(`📡 API Endpoints available:`);
                console.log(`   GET /api/results - Detailed monitoring results with optional filtering`);
                console.log(`   GET /api/group-hierarchy - Group structure for dashboard drilldown`);
                console.log(`   GET /api/stats - Aggregated statistics per monitored URL`);
                console.log(`   GET /health - Health check endpoint`);
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('Web server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}