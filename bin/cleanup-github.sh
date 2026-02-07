#!/bin/bash
# GitHub Security Cleanup - Remove sensitive docs before hackathon
# Backups saved in: ~/clawd/caverns-and-clawds-internal-docs/

set -e

cd ~/clawd/caverns-and-clawds

echo "🗑️  Removing security-sensitive documentation from Git..."

# Priority 0 - MUST DELETE
git rm -f COMPREHENSIVE-EXPLOIT-AUDIT.md
git rm -f MONEY-FLOW-AUDIT.md
git rm -f WHATS-MISSING.md

# Priority 1 - SHOULD DELETE
git rm -f QA-REPORT-2026-02-03.md
git rm -f scripts/micro-price-audit.md
git rm -f docs/API-AUDIT-2026-02-05.md

# Priority 2 - NICE TO DELETE
git rm -f PRODUCTION_TEST_REPORT.md
git rm -f TURN-RESOLUTION-DIAGNOSIS.md
git rm -f tasks/money-flow-audit.md

echo "📝 Updating .gitignore..."

# Add patterns to prevent future commits
cat >> .gitignore << 'EOF'

# Internal documentation - never commit
*AUDIT*.md
*QA-REPORT*.md
WHATS-MISSING.md
TURN-RESOLUTION*.md
*TEST*REPORT*.md
tasks/money-*.md
bin/*-bot.js
bin/*-social.js
bin/*-economy*.js
bin/*-trader.js
EOF

echo "💾 Committing changes..."
git add .gitignore
git commit -m "Security: Remove internal audit documentation"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary:"
echo "  - 9 sensitive files removed from Git"
echo "  - .gitignore updated to prevent future commits"
echo "  - Backups saved in: ~/clawd/caverns-and-clawds-internal-docs/"
echo ""
echo "⚠️  Next steps:"
echo "  1. Review changes: git log -1 --stat"
echo "  2. Push to GitHub: git push -f origin main"
echo "  3. Verify on GitHub web interface"
echo ""
