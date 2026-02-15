#!/usr/bin/env bash
# Creates symlinks in ~/mnemo/ pointing to all relevant Mnemo directories.
# Run once on the Ubuntu server after deployment.

set -euo pipefail

LINK_DIR="$HOME/mnemo"

mkdir -p "$LINK_DIR"

ln -sfn /opt/mnemo        "$LINK_DIR/code"
ln -sfn /var/lib/mnemo     "$LINK_DIR/data"
ln -sfn /var/log/mnemo     "$LINK_DIR/logs"
ln -sfn /etc/mnemo         "$LINK_DIR/config"

echo "Shortcuts created in $LINK_DIR/"
ls -l "$LINK_DIR/"
