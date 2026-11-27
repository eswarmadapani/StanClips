#!/usr/bin/env python3
"""StanClips Pre-Commit Secret Scanner.

Scans staged Git diffs for potential secrets, credentials, and API keys
before allowing a commit to be created.
"""
import os
import re
import subprocess
import sys

PATTERNS = [
    ("OpenAI API Key", re.compile(r'sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}')),
    ("Google API Key", re.compile(r'AIza[0-9A-Za-z\\-_]{35}')),
    ("GitHub Token", re.compile(r'gh[pousr]_[A-Za-z0-9_]{36,255}')),
    ("Meta / IG Access Token", re.compile(r'EAACEdEose0cBA[0-9A-Za-z]+')),
    ("Private Key", re.compile(r'-----BEGIN [A-Z ]+ PRIVATE KEY-----')),
    ("Generic Password Assignment", re.compile(r'(?i)(password|passwd|pwd)[\s\'":=]+([a-zA-Z0-9_\-\.\$!%*#?&]{8,40})')),
]

SAFE_PREFIXES = ("mock_", "dummy_", "example_", "test_fixture_", "change-me-", "your-", "wrong_")

def main():
    try:
        diff = subprocess.check_output(["git", "diff", "--cached", "-U0"], text=True, errors="replace")
    except Exception as e:
        print(f"[pre-commit] Error reading staged diff: {e}")
        return 0

    if not diff:
        return 0

    violations = []
    current_file = ""

    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            current_file = line[6:]
            continue
        if current_file.endswith("pre-commit-secrets-check.py"):
            continue
        if not line.startswith("+") or line.startswith("+++"):
            continue

        added_content = line[1:].strip()
        # Skip comments in examples or docs
        if added_content.startswith("#") and current_file.endswith(".example"):
            continue

        for label, pattern in PATTERNS:
            for match in pattern.finditer(added_content):
                val = match.group(match.lastindex)
                if any(val.lower().startswith(p) for p in SAFE_PREFIXES):
                    continue
                if val.lower() in ["string", "password", "newpassword", "currentpassword", "none", "null"]:
                    continue
                violations.append((current_file, label, added_content[:80]))

    if violations:
        print("\n" + "=" * 60)
        print(" [SECURITY ALERT] Potential secret detected in staged commit!")
        print("=" * 60)
        for f, label, sample in violations:
            print(f"  File: {f}")
            print(f"  Type: {label}")
            print(f"  Line: {sample}")
            print("-" * 60)
        print("Commit rejected. Please sanitize before committing.\n")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
