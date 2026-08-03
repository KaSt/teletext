# KA TEXT

A wholly static, explorable Teletext service inspired by the mystery of searching numbered pages before the web.

The production hostname is intended to be **https://teletext.ka.st**.

## Features

- 40-column, 24-line Teletext-style display
- Keyboard-first page navigation
- Delayed page acquisition and missing pages
- Static editorial pages and deterministic daily-generated pages
- Hidden/unlisted pages
- Local-only discovery history
- Optional CRT scanlines and flicker
- No framework, build step, backend, account, analytics, cookies, or external dependency

## Controls

| Key | Action |
| --- | --- |
| `0–9` | Enter a three-digit page number |
| `Enter` | Request the entered page |
| `←` / `→` | Previous / next page |
| `H` | Home page 100 |
| `C` | Toggle CRT effect |
| `Esc` | Clear partial page input |

## Run locally

Because the project uses ES modules, serve the directory through a tiny local HTTP server rather than opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Static pseudo-random behaviour

Generated content is seeded using the local calendar date, page number, and a purpose-specific salt. The same page therefore produces the same result throughout a given day, but can change the following day. All generation happens in the browser.

## Deployment

The repository can be deployed directly through GitHub Pages from the `main` branch. The included `CNAME` file points Pages to `teletext.ka.st`.

For the DNS side, configure the subdomain according to GitHub Pages' current custom-domain instructions.

## Design principle

This is not meant to reproduce only what Teletext technically was. It aims to reproduce what it felt like: a small numbered world with blank regions, mundane information, accidental discoveries, and the suspicion that an undocumented page may exist somewhere in the signal.
