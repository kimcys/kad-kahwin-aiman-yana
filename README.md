# Aiman x Alyana - Lover Inspired Digital Card

Pastel Lover-inspired digital invitation for:

- Muhammad Aiman Hakim Bin Azahari
- Nurul Alyana Binti Che Aman
- Walimatul Urus
- Date: Saturday, 08 Ogos 2026
- Time: 11 Pagi - 3 Petang
- Venue: Seri Mentari Glasshall
- Address: Jalan Bukit Katil - Duyong, 75460, Melaka
- Hashtag: #AiLoveYa

## V5 refinement

- Rebuilt the cover title so the large `A` is side-by-side with the right-side `iman` and `lyana` stack.
- Removed the previous title overlap/stacking on top of the `A`.
- Added final centering overrides so the opening page, main cover, cards, panels, and menu content sit centered.
- Keeps the icon-only bottom navigation: calendar, location, music, RSVP, and contact.
- Connects the uploaded music file as `assets/audio/lover.mp3`.
- Uses the uploaded pastel soft pink, blue, and yellow background image.

## Fonts

The CSS is prepared for these requested fonts:

- Title: Jimmy Script
- Body: Coco Gothic UltraLight Trial
- Hashtag: Bimbo Trial

Font files are not packaged in this project. Place your licensed/trial font files in:

```txt
assets/fonts/
```

Expected local filenames:

```txt
JimmyScript-Rg.otf
CocoGothic-UltraLight_trial.ttf
Bimbo Trial.ttf
```

The `@font-face` rules are already prepared in `css/style.css`. Fallback web fonts are included so the card still displays before you add the local font files.

## Music

The uploaded audio file is included as:

```txt
assets/audio/lover.mp3
```

The music starts only after the guest taps the music button, which follows browser autoplay rules. Make sure you have suitable permission before publishing the site publicly.

## Edit details

Main event data is in:

```txt
js/main.js
```

Visible text is in:

```txt
index.html
```

## Preview locally

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 3000
```

Then open:

```txt
http://localhost:3000
```

## RSVP and wishes

The RSVP and wishes features are demo-only and save to the guest device using `localStorage`. For production, connect them to Supabase, Firebase, Google Sheets, or your own backend.
