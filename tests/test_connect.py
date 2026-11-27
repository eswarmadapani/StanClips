"""One-click Connect for YouTube, Instagram and TikTok, and posting to each. The platforms are replaced by
stand-ins answering the way their documentation says, so nothing leaves this machine."""
import json, os, sys, tempfile, time
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
os.environ["PEAKCUT_DATA"] = tempfile.mkdtemp(prefix="pc-connect-")
os.environ.update(DATABASE_URL="", PEAKCUT_ACCOUNTS="1", PEAKCUT_PUBLIC_URL="https://clips.example.com", PEAKCUT_VERIFY_EMAIL="0",
                  GOOGLE_CLIENT_ID="", GOOGLE_CLIENT_SECRET="", GOOGLE_CLIENT_FILE="", PEAKCUT_YOUTUBE_REDIRECT_URI="", PEAKCUT_IG_APP_ID="", PEAKCUT_IG_APP_SECRET="", PEAKCUT_IG_UPLOAD_MODE="public",
                  PEAKCUT_TIKTOK_CLIENT_KEY="", PEAKCUT_TIKTOK_CLIENT_SECRET="")
sys.path.insert(0, ".")
from pathlib import Path
import sqlalchemy as sa
from fastapi.testclient import TestClient
from studio import accounts, auth, config, ctx, db, posting, server
db.init()
fails = []
def check(n, got, want=True):
    ok = want(got) if callable(want) else got == want
    print(("PASS " if ok else "FAIL ") + n + ("" if ok else f"   got {got!r}")); ok or fails.append(n)

BASE = "https://clips.example.com"
ORIGIN = {"Origin": BASE}
def person(email, admin=False):
    u, _ = auth._create(email, email.split("@")[0], password_hash="x")
    if admin:
        with db.engine.begin() as c:
            c.execute(db.users.update().where(db.users.c.id == u.id).values(is_admin=True))
    cl = TestClient(server.app, base_url=BASE, follow_redirects=False)
    cl.cookies.set(auth.COOKIE, auth.start_session(u.id))
    return u, cl
boss, a = person("boss@example.com", admin=True)
user, b = person("user@example.com")

# ---- nothing is set up: the buttons say so, and only an admin may set it up
st = b.get("/api/status").json()
check("nothing can be connected before setup", st["connect"], {"youtube": False, "instagram": False, "tiktok": False})
check("a normal user cannot see the setup", b.get("/api/apps").status_code, 404)
check("...or change it", b.put("/api/apps", json={"platform": "tiktok", "client_id": "abcd", "client_secret": "x"}, headers=ORIGIN).status_code, 404)
r = b.get("/oauth/instagram/start")
check("Connect before setup comes back with a reason", (r.status_code, "connect_error" in r.headers.get("location", "")), (303, True))
check("setup from another website is refused", a.put("/api/apps", json={"platform": "tiktok", "client_id": "abcd1234", "client_secret": "s"},
                                                    headers={"Origin": "https://evil.example"}).status_code, 403)
check("a bad id is refused", a.put("/api/apps", json={"platform": "tiktok", "client_id": "a b<", "client_secret": "s"}, headers=ORIGIN).status_code, 400)
for pf, cid in (("youtube", "g-client-123.apps"), ("instagram", "1234567890"), ("tiktok", "awtiktokkey123")):
    r = a.put("/api/apps", json={"platform": pf, "client_id": cid, "client_secret": f"{pf}-secret-value"}, headers=ORIGIN)
    check(f"{pf} app saved", (r.status_code, r.json()[pf]["ready"]), (200, True))
apps = a.get("/api/apps").json()
check("secrets are never sent back", any("secret-value" in json.dumps(v) for v in apps.values()), False)
check("each platform shows the address to register", apps["tiktok"]["redirect"], BASE + "/oauth/tiktok/callback")
r = a.put("/api/apps", json={"platform": "tiktok", "client_id": "", "client_secret": "mock_dummy_tiktok_secret_example_only"}, headers=ORIGIN)
check("a new secret alone keeps the saved id", accounts.app_keys("tiktok"), ("awtiktokkey123", "mock_dummy_tiktok_secret_example_only"))
check("everyone can connect now", b.get("/api/status").json()["connect"], {"youtube": True, "instagram": True, "tiktok": True})

check("Draft editor opens without a previous job", b.get("/app/layout-studio/draft").status_code, 200)
draft = b.get("/api/layout-draft").json()
check("Draft includes editable regions", set(draft["layout"]["regions"]), {"facecam", "gameplay"})
check("Template listing reaches the templates handler", b.get("/api/layout-studio/templates").status_code, 200)
check("Draft rejects unsupported sites", b.get("/api/layout-draft/frame", params={"url":"https://example.com"}).status_code, 400)
with patch.object(server.media, "preview", return_value={"is_live":False, "duration":120}), patch.object(
        server.media, "download_section", return_value=Path("web/brand/demo-clean.mp4")) as section:
    result = b.get("/api/layout-draft/frame", params={"url":"https://www.youtube.com/watch?v=sample"})
    check("Selected source becomes a playable frame", (result.status_code, result.content[4:8]), (200, b"ftyp"))
    check("Only a short section is fetched", section.call_args.args[4] - section.call_args.args[3], lambda d: abs(d-1)<0.001)
check("A new job keeps the manual layout", server.jobs.clean_options({"layout_data":draft["layout"]})["layout_data"]["regions"], draft["layout"]["regions"])

# ---- the platforms, as stand-ins
class R:
    def __init__(self, code, data=None, headers=None, text=None):
        self.status_code, self._d, self.headers = code, data, headers or {}
        self.text = text if text is not None else json.dumps(data)
    def json(self):
        if self._d is None:
            raise ValueError
        return self._d
calls, uploads, tt = [], [], {"audited": False, "status": 0}
def post(url, data=None, json=None, headers=None, params=None, timeout=None, content=None):
    calls.append(("POST", url, data or json, headers or {}))
    if url == "https://oauth2.googleapis.com/token":
        return R(200, {"access_token": "yt-access", "refresh_token": "yt-refresh", "expires_in": 3600})
    if url.endswith("/upload/youtube/v3/videos"):
        return R(200, headers={"Location": "https://upload.example/yt-session"})
    if url == "https://api.instagram.com/oauth/access_token":
        if data["code"] != "igcode":
            return R(400, {"error_message": "bad code"})
        return R(200, {"data": [{"access_token": "ig-short", "user_id": "17841", "permissions": "instagram_business_basic,instagram_business_content_publish"}]})
    if url.endswith("/oauth/token/"):
        if data.get("grant_type") == "refresh_token":
            return R(200, {"access_token": "tt-access-2", "refresh_token": "tt-refresh-2", "expires_in": 7200, "open_id": "oid", "scope": "user.info.basic,video.publish"})
        return R(200, {"access_token": "tt-access", "refresh_token": "tt-refresh", "expires_in": 7200, "open_id": "oid", "scope": "user.info.basic,video.publish"})
    if url.endswith("/creator_info/query/"):
        return R(200, {"data": {"creator_username": "streamerclips", "creator_nickname": "Streamer Clips",
                                "privacy_level_options": ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]}, "error": {"code": "ok"}})
    if url.endswith("/post/publish/video/init/"):
        lv = json["post_info"]["privacy_level"]
        tt["init"] = json
        if lv != "SELF_ONLY" and not tt["audited"]:
            return R(403, {"error": {"code": "unaudited_client_can_only_post_to_private_accounts", "message": "private only"}})
        return R(200, {"data": {"publish_id": "v_pub_1", "upload_url": "https://open-upload.tiktokapis.com/video/?upload_id=1"}, "error": {"code": "ok"}})
    if url.endswith("/post/publish/status/fetch/"):
        tt["status"] += 1
        if tt["status"] < 2:
            return R(200, {"data": {"status": "PROCESSING_UPLOAD"}, "error": {"code": "ok"}})
        return R(200, {"data": {"status": "PUBLISH_COMPLETE", "publicaly_available_post_id": [7300] if tt["audited"] else []}, "error": {"code": "ok"}})
    if url.endswith("/17841/media"):
        return R(200, {"id": "container1"})
    if url.endswith("/17841/media_publish"):
        return R(200, {"id": "media1"})
    return R(404, {})
def get(url, params=None, headers=None, timeout=None):
    calls.append(("GET", url, params, headers or {}))
    if url.endswith("/youtube/v3/channels"):
        return R(200, {"items": [{"id": "UC123", "snippet": {"title": "My Channel"}}]})
    if url == "https://graph.instagram.com/access_token":
        return R(200, {"access_token": "ig-long", "token_type": "bearer", "expires_in": 5183944})
    if url == "https://graph.instagram.com/me":
        return R(200, {"user_id": "17841", "username": "clipper", "account_type": "MEDIA_CREATOR"})
    if url.endswith("/container1"):
        return R(200, {"status_code": "FINISHED"})
    if url.endswith("/media1"):
        return R(200, {"permalink": "https://www.instagram.com/reel/abc/"})
    return R(404, {})
def put(url, content=None, headers=None, timeout=None):
    uploads.append((url, len(content), headers))
    if url == "https://upload.example/yt-session":
        return R(201, {"id": "video1"})
    return R(201, None, text="")
accounts.httpx.post, accounts.httpx.get, accounts.httpx.put = post, get, put
accounts.time.sleep = lambda s: None

# ---- connecting: the button goes to the platform's own page, and back
def connect(cl, pf, code="code1"):
    r = cl.get(f"/oauth/{pf}/start")
    loc = urlparse(r.headers["location"])
    state = parse_qs(loc.query)["state"][0]
    back = cl.get(f"/oauth/{pf}/callback", params={"code": code, "state": state})
    return loc, back
loc, back = connect(b, "youtube")
check("YouTube: Google's page, asking to upload", (loc.netloc, "youtube.upload" in parse_qs(loc.query)["scope"][0]), ("accounts.google.com", True))
check("YouTube: back on Connected apps, connected", (back.status_code, back.headers["location"].startswith("/app/settings/apps?connected=youtube")), (303, True))
loc = urlparse(b.get("/oauth/youtube/start").headers["location"])
yt_query = parse_qs(loc.query)
accounts.save_app("public_url", "https://new-tunnel.example.com", "")
back = b.get("/oauth/youtube/callback", params={"code": "ytcode", "state": yt_query["state"][0]})
exchange = [c for c in calls if c[1] == "https://oauth2.googleapis.com/token"][-1]
check("YouTube keeps the original callback during sign-in", exchange[2]["redirect_uri"], yt_query["redirect_uri"][0])
accounts.save_app("public_url", "", "")
with patch.dict(os.environ, PEAKCUT_YOUTUBE_REDIRECT_URI="http://127.0.0.1:8765/oauth/youtube/callback"):
    check("Only YouTube uses its fixed local callback",
          (accounts.redirect_for("youtube"), accounts.redirect_for("instagram")),
          ("http://127.0.0.1:8765/oauth/youtube/callback", BASE + "/oauth/instagram/callback"))
loc, back = connect(b, "instagram", "igcode#_")
q = parse_qs(loc.query)
check("Instagram: Instagram's own page, with publishing permission", (loc.netloc, q["client_id"][0], "instagram_business_content_publish" in q["scope"][0]),
      ("www.instagram.com", "1234567890", True))
check("Instagram: connected, with the #_ Instagram adds to the code removed", "connected=instagram" in back.headers["location"])
# The tunnel setting can change while the person is signing in. The code must
# still be exchanged with the exact address sent at the start.
loc = urlparse(b.get("/oauth/instagram/start").headers["location"])
ig_query = parse_qs(loc.query)
accounts.save_app("public_url", "https://new-tunnel.example.com", "")
back = b.get("/oauth/instagram/callback", params={"code": "igcode", "state": ig_query["state"][0]})
exchange = [c for c in calls if c[1] == "https://api.instagram.com/oauth/access_token"][-1]
check("Instagram keeps the original redirect during token exchange", exchange[2]["redirect_uri"], ig_query["redirect_uri"][0])
check("Instagram connects after the public address changes", "connected=instagram" in back.headers["location"])
back = b.get("/oauth/instagram/callback", params={"code": "igcode", "state": ig_query["state"][0]})
check("Instagram state cannot be reused", "connect_error" in back.headers["location"])
accounts.save_app("public_url", "", "")
loc, back = connect(b, "tiktok")
q = parse_qs(loc.query)
check("TikTok: TikTok's own page, asking to post", (loc.netloc, q["client_key"][0], q["scope"][0]), ("www.tiktok.com", "awtiktokkey123", "user.info.basic,video.publish"))
check("TikTok: connected", "connected=tiktok" in back.headers["location"])
accs = {x["platform"]: x for x in b.get("/api/accounts").json()}
check("all three accounts are listed with their names", (accs["youtube"]["name"], accs["instagram"]["name"], accs["tiktok"]["name"]),
      ("My Channel", "@clipper", "@streamerclips"))
check("tokens never reach the page", any(t in b.get("/api/accounts").text for t in ("ig-long", "tt-access", "yt-refresh")), False)
check("someone else's accounts are not mine", a.get("/api/accounts").json(), [])
r = b.get("/oauth/tiktok/callback", params={"code": "x", "state": "made-up"})
check("a made-up return is refused", "connect_error" in r.headers["location"])
r = b.get("/oauth/tiktok/callback", params={"error": "access_denied"})
check("cancelling on the platform says so", "cancelled" in r.headers["location"])
loc = urlparse(a.get("/oauth/tiktok/start").headers["location"])
r = b.get("/oauth/tiktok/callback", params={"code": "c", "state": parse_qs(loc.query)["state"][0]})
check("one person's sign-in cannot be finished by another", "connect_error" in r.headers["location"])
check("an unknown platform does not exist", b.get("/oauth/myspace/start").status_code, 404)

# ---- the one-hour links Instagram fetches clips from
with ctx.as_user(user.id):
    jd = config.user_dir(user.id) / "jobs" / "job-12345678" / "clips"
jd.mkdir(parents=True)
(jd.parent / "job.json").write_text(json.dumps({"id": "job-12345678", "user": user.id, "dir": str(jd.parent), "clips": [], "status": "done",
                                                "creator": None, "created": time.time(), "options": {}, "source": {"type": "file"}}), encoding="utf-8")
(jd / "clip01.mp4").write_bytes(b"\x00" * 6_000)
from studio import jobs
jobs.load_user(user.id)
with ctx.as_user(user.id):
    link = accounts.clip_link("job-12345678", "clip01.mp4")
anon = TestClient(server.app, base_url=BASE)
path = urlparse(link).path
check("a signed link serves the clip to anyone, no sign-in", (anon.get(path).status_code, len(anon.get(path).content)), (200, 6000))
bad = path.replace(".mp4", "x.mp4")
check("a changed link does not", anon.get(bad).status_code, 404)
check("a made-up link does not", anon.get("/pub/abc.def.mp4").status_code, 404)
with ctx.as_user(user.id):
    old = accounts.clip_link("job-12345678", "clip01.mp4", seconds=-5)
check("an expired link does not", anon.get(urlparse(old).path).status_code, 404)

# ---- posting
with ctx.as_user(user.id):
    yt = accounts.get(accs["youtube"]["id"])
    yt["expires"] = 0
    accounts._put(yt)
    job = jobs.get("job-12345678")
    clip = {"id": "clip01", "file": "clip01.mp4", "status": "done", "title": "First clip"}
    job["clips"].append(clip)
    post_row, = posting.enqueue(job, clip, [yt["id"]], now=True)
    calls.clear()
    with patch.object(accounts, "app_keys", return_value=("", "")):
        posting._post(post_row)
    check("YouTube: missing app credentials stop retries before contacting Google",
          (post_row["status"], post_row["tries"], "Set up" in post_row["error"], len(calls)), ("failed", 1, True, 0))
    for code in ("unauthorized_client", "invalid_grant"):
        posting.retry(post_row["id"])
        with patch.object(accounts.httpx, "post", return_value=R(401, {"error": code})):
            posting._post(post_row)
        check(f"YouTube: {code} asks for sign-in repair after one attempt",
              (post_row["status"], "Connected apps" in post_row["error"]), ("failed", True))
    posting.retry(post_row["id"])
    with patch.object(accounts.httpx, "post", return_value=R(503, {})):
        posting._post(post_row)
    check("YouTube: a temporary Google failure still retries", post_row["status"], "scheduled")
    posting._post(post_row)
    form = next(c[2] for c in calls if c[1] == "https://oauth2.googleapis.com/token")
    check("YouTube: renewal uses the saved Google app and channel refresh token",
          (form["client_id"], form["client_secret"], form["refresh_token"]), ("g-client-123.apps", "youtube-secret-value", "yt-refresh"))
    check("YouTube: the queue uploads the MP4 and saves the Shorts link",
          (uploads[-1][:2], post_row["status"], post_row["url"]), (("https://upload.example/yt-session", 6000), "posted", "https://www.youtube.com/shorts/video1"))
    old_row = dict(post_row, id="old-failure", status="failed")
    posting._posts.append(old_row)
    try:
        posting.retry(old_row["id"])
    except ValueError:
        pass
    check("An earlier failed attempt cannot post the same clip twice", old_row["status"], "failed")

    ig, ttacc = accounts.get(accs["instagram"]["id"]), accounts.get(accs["tiktok"]["id"])
    calls.clear()
    rid, url = accounts.instagram_upload(ig, jd / "clip01.mp4", "My caption", "job-12345678")
    made = next(c for c in calls if c[1].endswith("/17841/media"))
    check("Instagram: a Reel from the signed link", (made[2]["media_type"], made[2]["video_url"].startswith(BASE + "/pub/")), ("REELS", True))
    check("Instagram: published, with its link", (rid, url), ("media1", "https://www.instagram.com/reel/abc/"))

    uploads.clear(); tt.update(audited=False, status=0)
    rid, url = accounts.tiktok_upload(ttacc, jd / "clip01.mp4", "My caption #fyp", "public")
    check("TikTok: an app not yet reviewed posts privately instead of failing", (tt["init"]["post_info"]["privacy_level"], url), ("SELF_ONLY", ""))
    check("TikTok: the whole file in one piece, with the right range", (len(uploads), uploads[0][2]["Content-Range"]), (1, "bytes 0-5999/6000"))
    check("TikTok: the account says why posts are private", "private" in accounts.get(ttacc["id"]).get("detail", ""))
    tt.update(audited=True, status=0)
    rid, url = accounts.tiktok_upload(ttacc, jd / "clip01.mp4", "My caption", "public")
    check("TikTok: once reviewed, public, with the video's link", (tt["init"]["post_info"]["privacy_level"], url),
          ("PUBLIC_TO_EVERYONE", "https://www.tiktok.com/@streamerclips/video/7300"))
    check("TikTok: big files go in pieces, the last taking the rest", accounts._tt_chunks(150_000_123), (10_000_000, 15))
    acc = accounts.get(ttacc["id"]); acc["expires"] = 0; accounts._put(acc)
    accounts._tt_token(accounts.get(ttacc["id"]))
    check("TikTok: an old sign-in is renewed, and the new refresh token kept", accounts.get(ttacc["id"])["refresh_token"], "tt-refresh-2")

print("ALL PASSED" if not fails else f"{len(fails)} failed")
import shutil; db.engine.dispose(); shutil.rmtree(os.environ["PEAKCUT_DATA"], ignore_errors=True)
sys.exit(1 if fails else 0)
