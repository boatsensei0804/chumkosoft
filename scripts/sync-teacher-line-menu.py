#!/usr/bin/env python3
"""Sync linked teacher LINE accounts with the per-user rich menu after deploy."""

import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.request


def main():
    token = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
    if not token:
        raise RuntimeError("LINE_CHANNEL_ACCESS_TOKEN GitHub secret is not configured")
    timestamp = str(int(time.time()))
    signature = hmac.new(token.encode(), f"{timestamp}.teacher-menu-sync".encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(
        "http://127.0.0.1:3000/api/internal/line-rich-menu/sync",
        data=b"",
        method="POST",
        headers={"X-Chumkosoft-Timestamp": timestamp, "X-Chumkosoft-Signature": signature},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.load(response)
            print(f"teacher menu: linked {data['linked']}, unlinked {data['unlinked']}, failed {data['failed']}")
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"teacher menu sync HTTP {error.code}: {error.read().decode(errors='replace')[:200]}") from error


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        print(f"Teacher menu sync failed: {error}", file=sys.stderr)
        sys.exit(1)
