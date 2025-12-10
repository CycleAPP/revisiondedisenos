#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%F)
FILENAME="$BACKUP_DIR/design_$DATE.dump"

# Keep only last 7 days
find $BACKUP_DIR -type f -name "*.dump" -mtime +7 -delete

# Dump database (as postgres user)
sudo -u postgres pg_dump -Fc diseno_empaque > /tmp/temp_backup.dump
mv /tmp/temp_backup.dump $FILENAME
