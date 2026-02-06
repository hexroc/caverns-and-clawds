# Railway Persistent Storage Setup

## Problem
Railway uses ephemeral storage by default. Every deploy wipes the SQLite database, losing all:
- Player characters & progress
- Economy transactions & stats
- Material inventories
- Bank accounts & loans  
- Real estate ownership
- Shop data

## Solution: Railway Volumes

Railway Volumes provide persistent disk storage that survives deploys.

### Step 1: Create a Volume (Railway Dashboard)

1. Go to https://railway.app/project/45f2b5d1-3c50-44c5-9afa-0bec349eb7a8
2. Click on your **Caverns&Clawds** service
3. Go to **Settings** tab
4. Scroll to **Volumes** section
5. Click **+ New Volume**
6. Configure:
   - **Mount Path:** `/data`
   - **Name:** `caverns-db-storage`
7. Click **Add**

### Step 2: Set Environment Variable

In the same Settings tab:
1. Go to **Variables** section
2. Click **+ New Variable**
3. Set:
   - **Name:** `RAILWAY_VOLUME_MOUNT_PATH`
   - **Value:** `/data`
4. Click **Add**

### Step 3: Deploy

The code already supports volumes (as of commit `[COMMIT_HASH]`). Just deploy:

```bash
git push origin main
```

Railway will:
1. Build the new image
2. Mount the volume to `/data`
3. Start the server with `RAILWAY_VOLUME_MOUNT_PATH=/data`
4. Server creates `/data/caverns.db` (persistent!)

### Step 4: Verify

Check the logs after deploy:
```
📁 Using SQLite database: /data/caverns.db
```

If you see this, persistence is working! 🎉

## What Gets Persisted

With volumes enabled, ALL data persists across deploys:
- ✅ Player characters & stats
- ✅ Economy transactions (full history)
- ✅ Material inventories & trading
- ✅ Bank accounts & loan history
- ✅ Real estate ownership
- ✅ Shop data & employee records
- ✅ Henchmen & awakened abilities
- ✅ Auction house listings
- ✅ Quest progress

## Backup Strategy

### Manual Backup (Recommended Weekly)

Railway doesn't auto-backup volumes. To backup:

1. **Download the database:**
   ```bash
   railway run -- cat /data/caverns.db > backup-$(date +%Y%m%d).db
   ```

2. **Store somewhere safe:**
   - Local machine
   - Google Drive
   - GitHub (if small enough, <100MB)

3. **Automate with cron (optional):**
   ```bash
   # Add to your local crontab
   0 3 * * 0 cd ~/clawd/caverns-and-clawds && railway run -- cat /data/caverns.db > backups/caverns-$(date +%Y%m%d).db
   ```

### Restore from Backup

If you need to restore:

```bash
railway run -- sh -c 'cat > /data/caverns.db' < backup-20260205.db
```

## Monitoring Volume Size

Railway free tier volumes are limited. Check usage:

```bash
railway run -- du -h /data/caverns.db
```

If it grows too large (>100MB), consider:
- Archiving old transactions
- Deleting inactive player data
- Upgrading to paid Railway plan

## Migration from Ephemeral to Volume

If you had data on the ephemeral storage and want to keep it:

1. **Before enabling volumes:** Export current DB
   ```bash
   railway run -- cat db/caverns.db > pre-volume-backup.db
   ```

2. **Enable volume** (steps above)

3. **After volume is mounted:** Import the backup
   ```bash
   railway run -- sh -c 'cat > /data/caverns.db' < pre-volume-backup.db
   ```

4. **Restart the service**

## Troubleshooting

### Database not found after volume setup
- Check `RAILWAY_VOLUME_MOUNT_PATH` is set to `/data`
- Check logs for the database path
- Volume may need a restart to mount properly

### Permission errors
- Railway volumes default to root ownership
- The app should have write access automatically
- If issues persist, contact Railway support

### Data still wiping
- Verify volume is actually mounted: `railway run -- ls /data`
- Check environment variable is set correctly
- Make sure you pushed the code that uses `RAILWAY_VOLUME_MOUNT_PATH`

## Alternative: Postgres (Future Upgrade)

If SQLite becomes a bottleneck:
1. Add Railway Postgres plugin
2. Set `DATABASE_URL` environment variable
3. Code auto-switches to Postgres (adapter already exists)
4. Postgres has automatic backups & better scaling

For now, volumes + SQLite is the sweet spot: simple, fast, persistent.
