"""Legacy update settings must not restore the upstream update service."""
import os
import sys
import tempfile
from unittest.mock import patch

sys.path.insert(0, ".")
with tempfile.TemporaryDirectory() as folder:
    os.environ.update(PEAKCUT_DATA=folder, DATABASE_URL="", PEAKCUT_ACCOUNTS="0",
                      PEAKCUT_UPDATE_CHECK="1", PEAKCUT_FETCH_MODEL="0")
    from fastapi.testclient import TestClient
    from studio import db, server
    db.init()
    with patch("httpx.get", side_effect=AssertionError("Unexpected outbound check")):
        status = TestClient(server.app, base_url="http://127.0.0.1:8765").get("/api/status").json()
        assert status["update"] is None and status["links"] == {}
    db.engine.dispose()
print("PASS local build has no update notice or developer links")
