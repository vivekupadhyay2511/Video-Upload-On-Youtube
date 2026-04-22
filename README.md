# Shorts To YouTube

This is a Next.js app that accepts a YouTube Shorts link or Instagram Reel link, downloads the source video, and uploads it to your YouTube channel.

## What it does

- Accepts a YouTube or Instagram short-form video URL
- Downloads the source video on the server
- Shows the downloaded video back in the app for preview
- Uploads the downloaded file to your YouTube channel with the title, description, and privacy level you choose

## Prerequisites

1. Node.js 22+
2. A Google Cloud project with the YouTube Data API v3 enabled
3. OAuth client credentials for a desktop or web app
4. A refresh token for the YouTube account/channel you want to upload into

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=https://developers.google.com/oauthplayground
YOUTUBE_REFRESH_TOKEN=...
```

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Important notes

- The app uses `youtube-dl-exec` to download YouTube Shorts and Instagram Reels. Some sites may change restrictions over time, so downloader support can break and require updates.
- Uploading to YouTube requires OAuth user credentials. Service accounts do not work for regular YouTube channel uploads.
- This flow performs long-running download and upload work on the Next.js server, so it is best suited for local use or a dedicated Node server instead of a serverless deployment.
