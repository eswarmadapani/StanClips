"""Exercise local delivery of a real Reel through the signed media route."""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

sys.path.insert(0, ".")
with tempfile.TemporaryDirectory() as folder:
    os.environ.update(PEAKCUT_DATA=folder, DATABASE_URL="", PEAKCUT_ACCOUNTS="0")
    from fastapi.testclient import TestClient
    from studio import accounts, ctx, db, server

    db.init()
    try:
        directory = Path(folder) / "test-job"
        clips = directory / "clips"
        clips.mkdir(parents=True)
        shutil.copyfile("web/brand/demo-clean.mp4", clips / "clip.mp4")
        with ctx.as_user("u_local"):
            path = urlsplit(accounts.clip_link("test-job", "clip.mp4")).path
        with patch.object(server.jobs, "get", return_value={"dir": str(directory)}):
            client = TestClient(server.app, base_url="http://127.0.0.1:8765")
            response = client.get(path)
            assert response.status_code == 200
            delivered = directory / "delivered.mp4"
            delivered.write_bytes(response.content)
            subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(delivered), "-f", "null", "-"], check=True)
            assert client.head(path).headers["content-length"] == str(len(response.content))
            tail = client.get(path, headers={"Range": "bytes=-16"})
            assert tail.status_code == 206 and tail.content == response.content[-16:]
            print("PASS signed Reel downloads, decodes, and supports HEAD and byte ranges")
    finally:
        db.engine.dispose()
