# URL Monitor

A TypeScript application that performs periodic HTTP requests to monitor website availability and performance, similar to running curl commands on a schedule. The application stores results in a SQLite database and provides a real-time web dashboard with interactive graphs.

## Features

- 🔍 **Periodic URL Monitoring** - Monitor multiple URLs with configurable intervals
- 📊 **Real-time Dashboard** - Web interface with interactive charts showing response times and status codes
- 💾 **Data Storage** - SQLite database for storing all monitoring results
- 📈 **Data Visualization** - Chart.js graphs for response times and status code distribution
- 📄 **CSV Configuration** - Load URLs from CSV files with group organization
- 🔔 **Slack Notifications** - Automatic alerts for consecutive URL failures
- ⚙️ **Flexible Configuration** - Support for both CSV and JSON configuration files
- 🤖 **GitHub Actions** - Automated monitoring in CI/CD pipelines
- 🛡️ **Error Handling** - Robust error handling with retry mechanisms
- 🚀 **TypeScript** - Full TypeScript implementation with strict typing
- 🎯 **Headless Mode** - Run without web interface for CI environments
- 🌍 **Country Code Support** - Send location-based cookies in requests
- 👥 **Group Organization** - Organize URLs into groups for better management

## Installation

1. Clone or navigate to the project directory
2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### CSV Configuration (Recommended)

Create a `urls.csv` file with the following format:

```csv
url,name,countryCode,group
https://www.max.com,US Homepage Max,US,Max Streaming
https://www.discoveryplus.com,D+ Homepage Max,US,Discovery Plus
https://github.com,GitHub,UK,Development Tools
https://www.google.com,Google,DE,Search Engines
```

**CSV Columns:**
- `url` - The URL to monitor (required)
- `name` - Display name for the URL (optional, defaults to URL)
- `countryCode` - Country code sent as cookie (optional, e.g., US, UK, CA, DE)
- `group` - Group name for organizing URLs (optional, defaults to "Ungrouped")

**Note:** Monitoring intervals are controlled by the GitHub Actions cron schedule and workflow configuration, not in the CSV file.

**Cookie Behavior:**
When a `countryCode` is specified, it will be sent as a cookie in the HTTP request:
```
Cookie: countryCode=US
```
This is useful for testing location-based services or CDN behavior.

### JSON Configuration (Legacy)

Alternatively, use `config.json`:

```json
{
  "urls": [
    {
      "url": "https://example.com",
      "name": "Example Site", 
      "interval": 60000
    }
  ],
  "defaultInterval": 60000,
  "retryAttempts": 3,
  "timeout": 10000
}
```

### Environment Variables

- `URLS_CSV_PATH` - Path to CSV file (default: `./urls.csv`)
- `CONFIG_JSON_PATH` - Path to JSON config (default: `./config.json`)
- `CHECK_INTERVAL` - Monitoring interval in milliseconds (default: 60000)
- `HEADLESS` - Run without web interface (`true`/`false`)
- `MONITOR_TIMEOUT` - Auto-stop after N seconds (for CI)
- `SLACK_WEBHOOK_URL` - Slack webhook URL for failure notifications (optional)

### Slack Notifications

The application can send Slack notifications when URLs fail consecutively (3+ failures in a row).

#### Setup:

1. **Create a Slack App:**
   - Go to https://api.slack.com/apps
   - Create a new app for your workspace
   - Enable "Incoming Webhooks"
   - Create a webhook for your desired channel

2. **Configure Environment Variable:**
   ```bash
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

3. **Run the Monitor:**
   ```bash
   npm run dev
   ```

#### Notification Behavior:

- 🚨 **Failure Alert**: Sent after 3 consecutive failures for the same URL
- ✅ **Recovery Alert**: Sent when a previously failed URL comes back online  
- 🔕 **No Spam**: Only one notification per failure sequence (won't spam on every failure)
- 📊 **Rich Format**: Includes URL details, group, error message, and dashboard link

#### Notification Content:
- URL name and address
- Group classification  
- Number of consecutive failures
- Error message details
- Timestamp and dashboard link

## Usage

### Development Mode
Start with auto-reload and web dashboard:
```bash
npm run dev
```

### Production Mode  
Build and run with web dashboard:
```bash
npm run build
npm start
```

### Headless Mode (CI/Server)
Run without web interface:
```bash
npm run build
npm run start:headless
```

## GitHub Deployment

### 🚀 Quick Setup

1. **Fork/Clone Repository**
   ```bash
   git clone <your-repo-url>
   cd url-monitor
   ```

2. **Configure GitHub Secrets**
   - Go to repository `Settings` → `Secrets and variables` → `Actions`
   - Add secret: `SLACK_WEBHOOK_URL` (optional, for failure notifications)

3. **Customize URLs**
   - Edit `urls.csv` with your URLs
   - Commit and push changes

4. **Enable Workflows**
   - GitHub Actions will automatically run every 15 minutes
   - Manual runs available via Actions tab

### 🔧 GitHub Actions Workflows

- **`url-monitor.yml`**: Scheduled monitoring every 15 minutes
- **`quick-check.yml`**: On-demand URL checking
- **`database-backup.yml`**: Daily database backups
- **`database-restore.yml`**: Manual database restoration
- **`database-maintenance.yml`**: Weekly maintenance

### 📊 Repository Features

**Works out-of-the-box with:**
- ✅ Automated URL monitoring
- ✅ Database persistence via GitHub artifacts
- ✅ Slack notifications (if configured)
- ✅ CSV-based URL configuration
- ✅ Group-based organization
- ✅ Failure tracking and alerts
- ✅ Data backup and restoration

**No additional setup required for:**
- URL monitoring functionality
- Database storage
- GitHub Actions automation
- CSV configuration loading
- Failure detection and logging

Or in development:
```bash
npm run dev:headless
```

### Web Dashboard
Access the dashboard at: `http://localhost:3000`

## GitHub Actions Integration

This project includes multiple GitHub Actions workflows for comprehensive monitoring and database management:

### 1. Scheduled Monitoring (`url-monitor.yml`)

Runs automatically every 15 minutes or manually triggered:

```yaml
# Runs every 15 minutes
schedule:
  - cron: '*/15 * * * *'
```

**Manual trigger options:**
1. Go to Actions tab in GitHub
2. Select "URL Monitor" workflow  
3. Click "Run workflow"
4. Configure:
   - **Duration**: How long to run (default: 3 minutes)
   - **Interval**: How often to check URLs (default: 30 seconds)

### 2. Quick URL Check (`quick-check.yml`)

On-demand URL checking with custom URLs:

**Manual trigger options:**
1. Go to Actions tab in GitHub
2. Select "Quick URL Check" workflow
3. Click "Run workflow" 
4. Configure:
   - **URLs**: Comma-separated URLs to check
   - **Duration**: How long to run (default: 2 minutes)
   - **Interval**: How often to check (default: 20 seconds)

**Example URLs:** `https://github.com,https://google.com,https://stackoverflow.com`

### 3. Database Backup (`database-backup.yml`)

Automated daily backups at 2 AM UTC:

```yaml
# Runs daily at 2 AM UTC
schedule:
  - cron: '0 2 * * *'
```

**Features:**
- Automatic daily backups of monitoring database
- Manual trigger with custom backup names
- Configurable retention periods (default: 90 days)
- Creates both SQLite backup and SQL dump
- Compressed archives for efficient storage
- Detailed backup reports with database statistics
- Handles cases where no database exists (creates sample data)

**Manual trigger options:**
1. Go to Actions tab → "Database Backup"
2. Click "Run workflow"
3. Configure:
   - **Backup Name**: Custom name (optional)
   - **Retention**: Days to keep backup (default: 90)

### 4. Database Restore (`database-restore.yml`)

Manual database restoration from backups:

**⚠️ Important:** This is a destructive operation that replaces the current database.

**Restore process:**
1. Go to Actions tab → "Database Restore"  
2. Click "Run workflow"
3. Provide:
   - **Run ID**: GitHub Actions run ID containing the backup
   - **Artifact Name**: Name of backup artifact to restore
   - **Confirmation**: Type "CONFIRM" to proceed
   - **Pre-restore Backup**: Create backup before restore (recommended)

### 5. Database Maintenance (`database-maintenance.yml`)

Weekly maintenance and cleanup on Sundays at 3 AM UTC:

```yaml
# Runs weekly on Sundays at 3 AM UTC
schedule:
  - cron: '0 3 * * 0'
```

**Operations available:**
- **backup-and-cleanup**: Create backup + health check
- **cleanup-only**: Remove old artifacts and optimize
- **database-health-check**: Integrity check + statistics
- **purge-old-data**: Remove records older than X days

**Manual trigger options:**
1. Go to Actions tab → "Database Maintenance"
2. Select operation type
3. Configure retention period for purge operations

### Workflow Features

- ✅ **Automatic CSV generation** from input URLs
- 📊 **Monitoring reports** with statistics and results
- 📁 **Artifact uploads** of database and reports  
- 💬 **PR comments** with monitoring results
- ⏰ **Configurable duration** for monitoring runs
- 🔧 **Error handling** and graceful shutdowns
- 💾 **Automated backups** with configurable retention
- 🔄 **Database restoration** capabilities
- 🧹 **Maintenance operations** for database health
- 📈 **Health monitoring** and integrity checks

### Setting Up GitHub Actions

1. Ensure `urls.csv` exists in repository root
2. Workflows will run automatically on schedule
3. Manual runs available in Actions tab
4. Check "Artifacts" section for detailed reports and backups
5. Use restore workflow to recover from backup artifacts
6. Monitor database health with maintenance workflow

### Backup and Recovery

**Automated Backups:**
- Daily backups at 2 AM UTC
- Retained for 90 days by default
- Include database file and SQL dumps
- Comprehensive reports with statistics

**Manual Backup:**
- Trigger anytime via Actions tab
- Custom naming and retention
- Immediate backup creation

**Database Restore:**
- Restore from any backup artifact
- Safety confirmation required
- Pre-restore backup creation
- Complete database replacement

**Maintenance:**
- Weekly health checks
- Database optimization
- Old data purging
- Integrity verification

## Project Structure

```
src/
├── types.ts           # TypeScript interfaces and types
├── database.ts        # SQLite database operations  
├── monitor.ts         # URL monitoring logic
├── webserver.ts       # Express.js web server
├── config-loader.ts   # CSV/JSON configuration loader
├── main.ts            # Main application (with dashboard)
└── main-headless.ts   # Headless application (for CI)

.github/
└── workflows/
    ├── url-monitor.yml    # Scheduled monitoring
    └── quick-check.yml    # Manual URL checking

public/
└── index.html         # Web dashboard

urls.csv              # URL configuration file
config.json           # Legacy JSON configuration  
```

## Dashboard Features

The web dashboard provides:

- **Real-time Statistics** - Success rates, average response times, and total requests per URL
- **Response Time Charts** - Historical response time trends over 24 hours
- **Success Rate Charts** - Success/failure patterns over time
- **Auto-refresh** - Dashboard updates every 30 seconds automatically

## Database

The application uses SQLite to store monitoring results with the following schema:

- `id` - Auto-incrementing primary key
- `url` - The monitored URL
- `name` - Display name for the URL
- `timestamp` - When the request was made
- `status` - HTTP status code
- `responseTime` - Response time in milliseconds
- `success` - Boolean indicating if request was successful
- `error` - Error message if request failed

## API Endpoints

- `GET /api/stats` - Aggregated statistics for all monitored URLs
- `GET /api/results?timeRange=-24 hours&urlName=Example` - Detailed results with optional filtering

## Development

### Available Scripts

- `npm run dev` - Start in development mode with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application

### Adding New URLs

1. Update `config.json` with new URL configurations
2. Restart the application to pick up changes

### Customizing Charts

The dashboard uses Chart.js for visualizations. You can modify the chart configurations in `public/index.html` to customize:

- Chart types and styling
- Time ranges and scales
- Colors and themes
- Data aggregation methods

## Graceful Shutdown

The application handles `SIGINT` and `SIGTERM` signals gracefully, ensuring:

- All monitoring intervals are cleared
- Database connections are closed properly
- Web server is shut down cleanly

Press `Ctrl+C` to stop the application.

## Dependencies

### Runtime Dependencies
- `axios` - HTTP client for making requests
- `sqlite3` - SQLite database driver
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `chart.js` - Charting library
- `date-fns` - Date utilities for charts

### Development Dependencies
- `typescript` - TypeScript compiler
- `@types/*` - Type definitions
- `ts-node` - TypeScript execution for development
- `nodemon` - Auto-reload for development

## License

ISC
