# Ad Reel Studio

A password-protected web app that turns a product or mockup photo into marketing videos made by Higgsfield, then adds hooks, selling points, an end card with a call to action, and SEO captions for TikTok, Instagram Reels, YouTube Shorts, Pinterest and X.

## How it works

1. **Product:** upload a photo, pick the shop (Etsy print on demand or custom embroidery) and a category. Print on demand starts with brushed aluminum prints, acrylic prints, tapestries and woven blankets, each with its own shot ideas. Name, selling points, price and link are optional.
2. **Video style:** "Pro videographer" (cinematic product film) or "Blogger showcase" (phone-shot creator video, optionally with a spoken line and three cuts). Pick a Higgsfield model and quality. Open **Shots** to pick up to 4 shots from a pop-up list (made-for-this-product, studio, lifestyle, seasonal and gift shots); with Kling, each becomes its own cut.
3. **Generate:** TikTok, Reels and Shorts share one vertical clip. Pinterest and X can reuse it or get their own. Each clip shows Higgsfield's price estimate where Higgsfield gives one, and only spends credits when you press Generate and confirm.
4. **Captions:** hooks, CTAs, captions, titles, hashtags and Pinterest keywords, tailored to the category. Edit and copy.
5. **Export:** the app draws the text on top of the Higgsfield clip in your browser and saves MP4s per platform, plus a zip with `captions.txt`. Use Chrome or Edge on a computer for the fastest export.

Finished clips are copied to the server when first opened, because Higgsfield removes outputs after about 7 days. "Earlier videos" lists them.

## Settings (environment variables)

Set these in Hostinger, never in the code:

| Name | What |
| --- | --- |
| `APP_PASSWORD` | The password to open the app, at least 8 characters. Without it the app is an open, look-only preview that anyone can view, and it will not generate even if `HF_API_KEY` is set |
| `HF_API_KEY` | Your Higgsfield API key from console.higgsfield.ai, written as `KEY_ID:KEY_SECRET` |
| `SESSION_SECRET` | Optional. Any long random text; keeps you signed in when you change the password |

## Run it locally

```
npm install
APP_PASSWORD=change-me-please HF_API_KEY=id:secret npm start
```

Then open http://localhost:3000.

## Tests

`npm test` runs the server against a fake Higgsfield, so it spends no credits.

## Adding a category

Open `public/catalog.js`, copy one entry in `CATEGORIES`, and change its words: `shop` (`pod` or `emb`), the scene ideas, the blogger setting and line, default selling points, keywords and hashtags.
