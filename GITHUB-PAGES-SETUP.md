# 🌐 GitHub Pages Dashboard Setup

## Quick Setup Instructions

### 1. Enable GitHub Pages
1. Go to your repository on GitHub
2. Navigate to `Settings` → `Pages`
3. Under "Source", select `GitHub Actions`
4. Save the settings

### 2. Trigger Dashboard Deployment
The dashboard will automatically deploy when:
- The URL monitor workflow runs (every 15 minutes)
- You manually trigger the "Deploy Dashboard to GitHub Pages" workflow
- You push changes to the repository

### 3. Access Your Dashboard
Your dashboard will be available at:
```
https://rohanojha-wm.github.io/crawler2
```

### 4. Dashboard Features
- ✅ **Real-time data**: Updates every 15 minutes with fresh monitoring data
- ✅ **Static hosting**: No server maintenance required
- ✅ **Mobile responsive**: Works on all devices
- ✅ **Group filtering**: View data by Max or Discovery+ groups
- ✅ **Failed requests page**: Detailed failure analysis

### 5. Dashboard Pages
- **Main Dashboard**: `/` - Group statistics and charts
- **Failed Requests**: `/failed-requests.html` - Detailed failure tracking

### 6. Data Refresh
The static dashboard automatically refreshes with new data every 15 minutes when:
1. URL monitoring workflow runs and collects new data
2. Dashboard deployment workflow runs and generates fresh static files
3. New data is pulled from the latest monitoring database

### 7. Troubleshooting
- **No data showing**: Wait for first monitoring cycle to complete (up to 15 minutes)
- **Old data**: Dashboard updates automatically, no action needed
- **Workflow failed**: Check Actions tab for error details

## Manual Deployment
You can also manually trigger dashboard deployment:
1. Go to `Actions` tab in your repository
2. Select "🌐 Deploy Dashboard to GitHub Pages"
3. Click "Run workflow"
4. Select branch and click "Run workflow"

The dashboard will be live within 1-2 minutes! 🎉
