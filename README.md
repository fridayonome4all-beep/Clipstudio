# Clip Studio 🎬

Fast, in-browser video creation studio with magnetic timeline editing, silence snapping, audio levelling, subtitle burning, and instant direct MP4 downloads.

---

## 🌐 Free Live URL (GitHub Pages)

Your web app includes an automated GitHub Actions deployment workflow (`.github/workflows/deploy.yml`) that builds and hosts your app for free.

### Step 1: Enable GitHub Pages (30 seconds)
1. Open your repository on GitHub.
2. Click **Settings** (the gear icon at the top of your repo).
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment** → **Source**, change the dropdown to **GitHub Actions**.
5. That's it! GitHub Actions will run automatically and your live site URL will be:
   ```
   https://<your-github-username>.github.io/<your-repository-name>/
   ```

---

## 🏷️ Adding a Free Custom URL / Domain

If you own a custom domain (e.g. `www.mycoolsite.com` or `studio.mybrand.org`), you can connect it for free:

1. In GitHub, go to **Settings** → **Pages**.
2. Scroll to **Custom domain** and type your domain (e.g., `clipstudio.mydomain.com`).
3. Click **Save**.
4. At your domain registrar (Namecheap, Cloudflare, GoDaddy, etc.), add a **CNAME** DNS record:
   - **Type**: `CNAME`
   - **Name / Host**: `clipstudio` (or `@` if using root apex)
   - **Target / Value**: `<your-github-username>.github.io`
5. Back in GitHub Settings → Pages, check **Enforce HTTPS** once DNS resolves.

---

## ⚡ Features

- **Direct MP4 Downloads**: Exports directly to your device's downloads folder without intermediate preview modals.
- **Magnetic Snap Timeline**: Clips snap automatically to nearest beat markers and audio silence boundaries when dragged.
- **Zero Mobile Data Needed**: All rendering, audio mixing, captioning, and video muxing run 100% inside your browser using Web Audio and Canvas.
- **Waveform & Silence Detection**: Visual audio scrubber with one-click silence detection and trimming.
- **Video & Image Mixing**: Combine short MP4 video footage with static storyboard images.
- **Color Grading**: Cinematic looks (Warm, Moody Noir, Vibrant Boost, Vintage Film, High Contrast).
- **Custom Title Cards**: Headline badges and lower thirds independent of SRT captions.

---

## 💻 Local Development

If you clone this repository to your computer:

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
