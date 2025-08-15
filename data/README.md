# Database Storage Directory

This directory stores the SQLite database files for the URL Monitor project.

## Files:
- `monitor.db` - Main monitoring database (auto-generated)
- `monitor-backup-*.db` - Timestamped backup files (auto-generated)

## Database Schema:
Following the schema defined in `src/database.ts`:
- `requests` table with columns: id, url, name, countryCode, group_name, timestamp, status, responseTime, success, error
- Indexes for performance on timestamp, url, group_name, and countryCode

## Backup Strategy:
- Automatic backups created on each monitoring cycle
- Keeps last 10 backups to prevent repository bloat
- Backup naming: `monitor-backup-YYYYMMDD-HHMMSS.db`

## CI/CD Integration:
- Database persists across GitHub Actions workflow runs
- Changes committed automatically by monitoring workflows
- Used by both scheduled monitoring and manual triggers
