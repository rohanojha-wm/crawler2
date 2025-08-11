import express from 'express';
import cors from 'cors';
import path from 'path';
import { Database } from './database';

export class WebServer {
  private readonly app: express.Application;
  private readonly database: Database;
  private server: any;

  constructor(database: Database, port: number = 3000) {
    this.app = express();
    this.database = database;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private setupRoutes(): void {
    // API Routes
    this.app.get('/api/group-hierarchy', async (req, res) => {
      try {
        const hierarchy = await this.database.getGroupHierarchy();
        res.json(hierarchy);
      } catch (error) {
        console.error('Error getting group hierarchy:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.database.getStats();
        res.json(stats);
      } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/groups', async (req, res) => {
      try {
        const groupStats = await this.database.getGroupStats();
        res.json(groupStats);
      } catch (error) {
        console.error('Error getting group stats:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/groups/:groupName/urls', async (req, res) => {
      try {
        const { groupName } = req.params;
        const urls = await this.database.getUrlsByGroup(groupName);
        res.json(urls);
      } catch (error) {
        console.error('Error getting URLs by group:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/status-codes', async (req, res) => {
      try {
        const { timeRange, group } = req.query;
        const statusCodes = await this.database.getStatusCodeStats(timeRange as string, group as string);
        res.json(statusCodes);
      } catch (error) {
        console.error('Error getting status codes:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/results', async (req, res) => {
      try {
        const { timeRange, urlName, group } = req.query;
        const results = await this.database.getResults(
          timeRange as string,
          urlName as string,
          group as string
        );
        res.json(results);
      } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get failed requests in the last 24 hours
    this.app.get('/api/failed-requests', async (req, res) => {
      try {
        const { timeRange } = req.query;
        const failedRequests = await this.database.getFailedRequests(timeRange as string || '-24 hours');
        res.json(failedRequests);
      } catch (error) {
        console.error('Error getting failed requests:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Serve the dashboard
  }

  private setupStaticRoutes(): void {
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
    this.app.get('/failed-requests', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/failed-requests.html'));
    });
  }

  start(port: number = 3000): void {
    this.server = this.app.listen(port, () => {
      console.log(`Web dashboard available at http://localhost:${port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      console.log('Web server stopped');
    }
  }
}
