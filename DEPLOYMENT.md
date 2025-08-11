# URL Monitor - GitHub Deployment Guide

## 🚀 Quick Deploy to GitHub

This URL monitoring system is ready for GitHub deployment with automated monitoring via GitHub Actions.

### 1. Repository Setup

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit - URL Monitor ready for deployment"
   git push origin main
   ```

2. **Configure GitHub Secrets (Optional - for Slack notifications):**
   - Go to `Settings > Secrets and variables > Actions`
   - Add `SLACK_WEBHOOK_URL` if you want Slack notifications

### 2. Automated Monitoring

The system includes 5 GitHub Actions workflows that will automatically run:

#### 🔄 Main Monitoring (`url-monitor.yml`)
- **Frequency:** Every 15 minutes
- **Purpose:** Monitors all URLs in `urls.csv`
- **Outputs:** Database updates, Slack notifications for failures

#### ⚡ Quick Check (`quick-check.yml`)  
- **Trigger:** Manual dispatch
- **Purpose:** Test specific URLs with custom intervals
- **Use:** For testing new URLs before adding to main config

#### 💾 Database Backup (`database-backup.yml`)
- **Frequency:** Daily at 2 AM UTC
- **Purpose:** Backs up monitoring.db to GitHub artifacts
- **Retention:** 30 days

#### 🔧 Database Restore (`database-restore.yml`)
- **Trigger:** Manual dispatch
- **Purpose:** Restore database from backup artifacts

#### 🧹 Database Maintenance (`database-maintenance.yml`)
- **Frequency:** Weekly on Sundays at 3 AM UTC
- **Purpose:** Cleanup old records, optimize database

### 3. Configuration

#### URLs Configuration (`urls.csv`)
```csv
url,name,group,countryCode
https://www.max.com,Max Homepage,Max,US
https://play.max.com,Max Player,Max,US
https://www.discoveryplus.com,Discovery+ Homepage,Discovery+,US
```

#### Environment Variables
- `HEADLESS=true` - Runs without web dashboard (perfect for GitHub Actions)
- `URLS_CSV_PATH` - Path to CSV file (defaults to `urls.csv`)
- `SLACK_WEBHOOK_URL` - For failure notifications

### 4. Dashboard Access

#### Option A: Local Dashboard (Recommended)
Run locally to view results:
```bash
npm install
npm run build
npm start
```
Visit: `http://localhost:3000`

#### Option B: GitHub Pages Static Dashboard (Advanced)
Enable GitHub Pages in repository settings to host a static version of the dashboard.

### 5. Monitoring Features

- ✅ **Real-time monitoring** every 15 minutes
- 📊 **Response time tracking** with historical data
- 🚨 **Failure detection** with consecutive failure alerts
- 📱 **Slack notifications** for failures and recoveries
- 🔍 **Group-based organization** for easy management
- 📈 **Status code tracking** with detailed error analysis
- 💾 **Automatic backups** with 30-day retention

### 6. Slack Integration

To enable Slack notifications:

1. Create a Slack webhook URL
2. Add as `SLACK_WEBHOOK_URL` secret in GitHub
3. The system will automatically notify on:
   - 3+ consecutive failures
   - Recovery after failures
   - Rich formatting with status details

### 7. Customization

#### Add New URLs
1. Edit `urls.csv`
2. Commit and push
3. Next monitoring cycle will include new URLs

#### Adjust Monitoring Frequency
Edit `.github/workflows/url-monitor.yml`:
```yaml
schedule:
  - cron: '*/15 * * * *'  # Every 15 minutes
```

#### Modify Failure Threshold
Edit `src/monitor.ts`:
```typescript
const CONSECUTIVE_FAILURE_THRESHOLD = 3; // Change this number
```

### 8. Troubleshooting

#### Check Workflow Status
- Go to `Actions` tab in GitHub repository
- Monitor workflow runs and logs

#### View Database
- Download backup artifacts from failed workflows
- Use SQLite tools to inspect data

#### Debug Monitoring
```bash
# Test locally in headless mode
npm run dev:headless

# Check specific URL
curl -I https://your-url.com
```

### 9. Production Best Practices

- ✅ URLs are monitored 24/7 automatically
- ✅ Failures trigger immediate Slack alerts
- ✅ Database is backed up daily
- ✅ Historical data is preserved
- ✅ No server maintenance required
- ✅ Scales automatically with GitHub Actions

## 📊 What Happens After Deployment

1. **Immediate:** GitHub Actions start monitoring every 15 minutes
2. **Within 1 hour:** First monitoring results available
3. **Daily:** Automatic database backups
4. **Weekly:** Database maintenance and cleanup
5. **On failures:** Instant Slack notifications (if configured)

Your URL monitoring system is now fully operational! 🎉
