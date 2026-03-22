#!/usr/bin/env bash
# Creates symlinks in ~/huxa/ pointing to all relevant HuXa directories.
# Run once on the Ubuntu server after deployment.

set -euo pipefail

LINK_DIR="$HOME/huxa"

mkdir -p "$LINK_DIR"

ln -sfn /opt/huxa        "$LINK_DIR/code"
ln -sfn /var/lib/huxa     "$LINK_DIR/data"
ln -sfn /var/log/huxa     "$LINK_DIR/logs"
ln -sfn /etc/huxa         "$LINK_DIR/config"

echo "Shortcuts created in $LINK_DIR/"
ls -l "$LINK_DIR/"
