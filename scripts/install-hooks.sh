#!/usr/bin/env bash
mkdir -p .git/hooks
cat << 'EOF' > .git/hooks/pre-commit
#!/bin/sh
python3 scripts/pre-commit-secrets-check.py || python scripts/pre-commit-secrets-check.py
EOF
chmod +x .git/hooks/pre-commit
echo "Pre-commit security hook installed successfully."
