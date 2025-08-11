<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# URL Monitor Project Instructions

This is a TypeScript project for monitoring URLs with periodic HTTP requests, data storage, and graph visualization.

## Project Structure
- `src/types.ts` - TypeScript interfaces and types
- `src/database.ts` - SQLite database operations for storing monitoring results
- `src/monitor.ts` - URL monitoring logic with periodic requests
- `src/webserver.ts` - Express.js web server for the dashboard
- `src/config-loader.ts` - CSV and JSON configuration file loader
- `src/main.ts` - Main application entry point (with web dashboard)
- `src/main-headless.ts` - Headless application entry point (for CI/CD)
- `public/index.html` - Web dashboard with Chart.js visualizations
- `urls.csv` - CSV configuration file for URLs and monitoring settings
- `config.json` - Legacy JSON configuration file
- `.github/workflows/` - GitHub Actions workflows for automated monitoring

## Key Features
- Periodic HTTP requests to configured URLs (like curl commands)
- CSV-based configuration for easy URL management
- SQLite database for storing response times, status codes, and success rates
- Real-time web dashboard with interactive charts
- Headless mode for CI/CD environments
- GitHub Actions integration for automated monitoring
- Configurable monitoring intervals per URL
- Graceful shutdown handling

## Configuration Options
- **CSV Configuration (Recommended)**: Load URLs from `urls.csv` with columns: url, name, countryCode
- **JSON Configuration (Legacy)**: Use `config.json` for structured configuration
- **Environment Variables**: Control behavior via URLS_CSV_PATH, HEADLESS, MONITOR_TIMEOUT, CHECK_INTERVAL
- **GitHub Actions**: Monitoring intervals controlled by cron schedules and workflow inputs
- **Country Code Cookies**: Optional countryCode column sends location-based cookies in requests

## Development Guidelines
- Use strict TypeScript with proper typing
- Follow async/await patterns for database operations
- Implement proper error handling for HTTP requests
- Use Chart.js for data visualization
- Maintain clean separation between monitoring, storage, and presentation layers
- Support both interactive (dashboard) and headless (CI) modes

## Database Schema
The SQLite database stores request results with fields: id, url, name, timestamp, status, responseTime, success, error.

## API Endpoints
- `GET /api/stats` - Returns aggregated statistics per monitored URL
- `GET /api/results` - Returns detailed monitoring results with optional filtering

## GitHub Actions Workflows
- `url-monitor.yml` - Scheduled monitoring workflow (every 15 minutes)
- `quick-check.yml` - Manual URL checking workflow with custom URLs and intervals
- `database-backup.yml` - Daily automated database backups (2 AM UTC)
- `database-restore.yml` - Manual database restoration from backup artifacts
- `database-maintenance.yml` - Weekly database maintenance and health checks (Sundays 3 AM UTC)
