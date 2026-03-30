#!/bin/bash
FECHA=$(date "+%Y-%m-%d %H:%M:%S")
LOG=/var/log/mis-scripts/disk-usage.log
echo "=== $FECHA ===" >> $LOG
df -h >> $LOG
