#!/bin/bash

# FBMS Project Protection & Backup Script
# Created: 2025-07-04
# Purpose: Comprehensive project protection and backup

set -e  # Exit on any error

PROJECT_DIR="/home/b/Documents/cursor/FBMS"
BACKUP_DIR="/home/b/Documents/cursor/FBMS_BACKUPS"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="FBMS_backup_${TIMESTAMP}"

echo "🛡️  FBMS Protection & Backup Script"
echo "=================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Create timestamped backup
echo "📦 Creating timestamped backup..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude=".git" \
  --exclude="*.log" \
  -C "$(dirname "$PROJECT_DIR")" \
  "$(basename "$PROJECT_DIR")"

echo "✅ Backup created: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"

# 2. Protect important files by making them read-only
echo "🔒 Protecting critical files..."

# Protect the chat session file
chmod 444 "$PROJECT_DIR/CHAT_SESSION.md"
echo "   - CHAT_SESSION.md protected (read-only)"

# Protect package.json and important config files
chmod 444 "$PROJECT_DIR/package.json"
chmod 444 "$PROJECT_DIR/package-lock.json" 2>/dev/null || true
chmod 444 "$PROJECT_DIR/pnpm-lock.yaml" 2>/dev/null || true
chmod 444 "$PROJECT_DIR/tsconfig.json" 2>/dev/null || true
chmod 444 "$PROJECT_DIR/vite.config.ts" 2>/dev/null || true
echo "   - Configuration files protected"

# Protect environment and config files
find "$PROJECT_DIR" -name "*.env*" -exec chmod 400 {} \; 2>/dev/null || true
echo "   - Environment files protected"

# 3. Create a recovery script
cat > "$BACKUP_DIR/restore_${TIMESTAMP}.sh" << 'EOF'
#!/bin/bash
# FBMS Recovery Script
# Usage: ./restore_TIMESTAMP.sh

BACKUP_FILE="$1"
RESTORE_DIR="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$RESTORE_DIR" ]; then
    echo "Usage: $0 <backup_file.tar.gz> <restore_directory>"
    exit 1
fi

echo "🔄 Restoring FBMS from backup..."
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
echo "✅ Restore completed to: $RESTORE_DIR"

# Make files writable again
find "$RESTORE_DIR" -type f -exec chmod 644 {} \;
find "$RESTORE_DIR" -type d -exec chmod 755 {} \;
echo "✅ File permissions restored"
EOF

chmod +x "$BACKUP_DIR/restore_${TIMESTAMP}.sh"
echo "✅ Recovery script created: $BACKUP_DIR/restore_${TIMESTAMP}.sh"

# 4. Create checksums for integrity verification
echo "🔍 Creating file integrity checksums..."
cd "$PROJECT_DIR"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \) \
  -not -path "./node_modules/*" \
  -not -path "./dist/*" \
  -not -path "./.git/*" \
  -exec sha256sum {} \; > "$BACKUP_DIR/checksums_${TIMESTAMP}.txt"

echo "✅ Checksums saved: $BACKUP_DIR/checksums_${TIMESTAMP}.txt"

# 5. Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -1t FBMS_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f || true
ls -1t restore_*.sh 2>/dev/null | tail -n +11 | xargs rm -f || true
ls -1t checksums_*.txt 2>/dev/null | tail -n +11 | xargs rm -f || true

# 6. Display summary
echo ""
echo "🎉 Protection & Backup Complete!"
echo "================================="
echo "Backup location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "Recovery script: $BACKUP_DIR/restore_${TIMESTAMP}.sh"
echo "Checksums file:  $BACKUP_DIR/checksums_${TIMESTAMP}.txt"
echo ""
echo "Protected files:"
echo "  - CHAT_SESSION.md (read-only)"
echo "  - Configuration files (read-only)"
echo "  - Environment files (owner-only)"
echo ""
echo "Total backups kept: $(ls -1 "$BACKUP_DIR"/FBMS_backup_*.tar.gz 2>/dev/null | wc -l)"

# 7. Git backup
echo "📚 Creating Git backup..."
cd "$PROJECT_DIR"
git bundle create "$BACKUP_DIR/git_backup_${TIMESTAMP}.bundle" --all
echo "✅ Git backup: $BACKUP_DIR/git_backup_${TIMESTAMP}.bundle"

echo ""
echo "🛡️  Your project is now protected and backed up!"