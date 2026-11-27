# Troubleshooting Guide

Solutions to common installation, rendering, and connectivity issues.

---

## 1. "FFmpeg is not installed or could not be found"
* **Cause**: FFmpeg executable binaries are not present in your operating system's PATH.
* **Solution**:
  * Windows: Run `winget install Gyan.FFmpeg`, then close and reopen your terminal.
  * Linux: Run `sudo apt install ffmpeg`.
  * macOS: Run `brew install ffmpeg`.
  * Or specify the folder directly in `.env`:
    ```ini
    PEAKCUT_FFMPEG_DIR=C:\ffmpeg\bin
    ```

---

## 2. Windows 260-Character Path Limits ("DLL load failed")
* **Cause**: Windows historically restricts file paths to 260 characters. Installing StanClip deeply inside nested user directories can cause the native ONNX speech library to fail to load.
* **Solution**:
  * Install StanClip in a short path such as `C:\StanClip` or `D:\StanClip`.
  * Enable Windows Long Paths:
    * Run PowerShell as Administrator:
      ```powershell
      New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
        -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
      ```

---

## 3. Port 8765 Already in Use (`[WinError 10048]` / `EADDRINUSE`)
* **Cause**: A previous instance of the StanClip server is still running in the background.
* **Solution**:
  * Run the stop helper:
    ```cmd
    scripts\stop.bat
    ```
  * Or find and terminate the process holding port 8765:
    ```powershell
    # Windows PowerShell
    $id = (Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue).OwningProcess
    if ($id) { Stop-Process -Id $id -Force }
    ```

---

## 4. YouTube "Confirm you're not a bot" on Server Hosting
* **Cause**: YouTube frequently blocks or throttles IP addresses originating from major cloud datacenters (AWS, DigitalOcean, Hetzner).
* **Solution**:
  * Run StanClip locally on residential connections.
  * Upload video files directly through the web UI rather than pasting YouTube URLs.
  * If hosted on a VPS, use Twitch or Kick links which do not restrict datacenter IP ranges.

---

## 5. Instagram OAuth Error 190 / 401 ("Error validating access token")
* **Cause**: Meta security checkpoints triggered on the connected Instagram account, or access token expiration.
* **Solution**:
  1. Open a web browser, log in to [instagram.com](https://www.instagram.com) directly with the target account, and complete any two-factor or security prompts.
  2. In StanClip, go to **Settings > Connected apps > Instagram**, disconnect the account, and click **Connect** to refresh permissions.
