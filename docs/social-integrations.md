# Social Media Integrations Guide

StanClip features automated one-click publishing to **YouTube Shorts**, **Instagram Reels**, and **TikTok**.

Connecting social channels is entirely optional. Users can download rendered MP4 files directly without connecting social media accounts.

---

## 1. YouTube Shorts (Google Cloud OAuth)

### Prerequisites
1. Open the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project or select an existing one.
3. Enable the **YouTube Data API v3** in APIs & Services.
4. Navigate to **APIs & Services > Credentials** and click **Create Credentials > OAuth client ID**.
5. Set Application Type to **Web application**.
6. Under **Authorized redirect URIs**, add:
   * Local: `http://127.0.0.1:8765/oauth/youtube/callback`
   * Production Server: `https://your-domain.com/oauth/youtube/callback`
7. Copy your **Client ID** and **Client Secret**.

### Configuration
Paste your credentials into StanClip at **Settings > Connected apps > YouTube > Set up**, or add them to `.env`:
```ini
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
PEAKCUT_YOUTUBE_REDIRECT_URI=http://127.0.0.1:8765/oauth/youtube/callback
```

> **API Verification Note**: Unverified apps in Google Cloud display a standard "Google hasn't verified this app" warning screen. You can proceed safely by clicking *Advanced > Go to StanClip (unsafe)*. Uploaded videos remain private until Google completes brand verification.

---

## 2. Instagram Reels (Meta for Developers)

### How It Works
Instagram Reels publishing utilizes the Instagram Graph API Content Publishing endpoints. Meta requires that video media be fetched from a publicly accessible HTTPS link.

StanClip generates secure, time-limited signed download links (`/pub/...`) and integrates with HTTPS tunnels (such as Cloudflare Tunnel or local HTTPS reverse proxies) to allow Instagram servers to fetch your clips.

### Prerequisites
1. Go to [Meta for Developers](https://developers.facebook.com).
2. Create an App of type **Business**.
3. Add the **Instagram** product.
4. Add your Instagram Creator or Business account as a Test User while in development mode.
5. In Instagram App settings, add the redirect URI:
   * `https://your-domain.com/oauth/instagram/callback`
   * Or your Cloudflare tunnel callback: `https://your-tunnel.trycloudflare.com/oauth/instagram/callback`

### Configuration
Configure in **Settings > Connected apps > Instagram > Set up**, or in `.env`:
```ini
PEAKCUT_IG_APP_ID=your_app_id
PEAKCUT_IG_APP_SECRET=your_app_secret
```

---

## 3. TikTok (TikTok for Developers)

### Prerequisites
1. Open the [TikTok for Developers Portal](https://developers.tiktok.com).
2. Register an application and enable **Login Kit** and **Content Posting API** (Direct Post).
3. Request scopes: `user.info.basic`, `video.publish`.
4. Configure redirect URI: `https://your-domain.com/oauth/tiktok/callback`.

### Configuration
Configure in **Settings > Connected apps > TikTok > Set up**, or in `.env`:
```ini
PEAKCUT_TIKTOK_CLIENT_KEY=your_client_key
PEAKCUT_TIKTOK_CLIENT_SECRET=your_client_secret
```

---

## 4. Post Spacing & Daily Caps

To protect your connected accounts from spam detection:
* Each creator profile allows setting a **Post Gap** (e.g. 45 minutes between uploads).
* Each creator profile enforces a **Daily Cap** (e.g. maximum 6 clips posted per 24-hour cycle).
* The Fair Post Queue automatically calculates the earliest safe publishing slot for every queued clip.
