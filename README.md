<div align="center">
  <img src="assets/Logo.png" alt="Verome API" width="120">
  <h1>Verome API</h1>
  <p>Music API for YouTube Music, Lyrics & Streaming</p>
  <p><a href="https://verome-api.deno.dev/">Live</a></p>
</div>

---

## Features

- Search songs, albums, artists with fallback video IDs
- Synced lyrics (LRC format) via LRCLib
- Audio streaming via Piped/Invidious proxies
- Radio mixes from any song
- Trending music & top artists by country
- Artist/track info from Last.fm
- Built-in web player with YouTube IFrame API
- Auto region detection from IP

## Quick Start

```bash
deno task start
```

Server runs at `http://localhost:8000`

## Development

```bash
deno task dev
```

## Project Structure

```
main.ts                    Entry point (Deno.serve)
ui.ts                      Web UI HTML
assets/                    Static assets (logo)
src/
├── helpers/
│   ├── response.ts        JSON/error helpers, CORS
│   ├── region.ts          IP-based region detection
│   └── router.ts          Route pattern matching
├── services/
│   ├── ytmusic.ts         YouTube Music API client
│   ├── ytmusic-parser.ts  YT Music response parsers
│   ├── youtube-search.ts  YouTube Search (web scraping)
│   ├── lastfm.ts          Last.fm API
│   ├── streaming.ts       Piped/Invidious stream fetching
│   ├── lyrics.ts          LRCLib lyrics
│   ├── entities.ts        Combined entity fetchers
│   └── discovery.ts       Trending, radio, top charts
└── routes/
    ├── search.ts          /api/search, /api/yt_search
    ├── content.ts         /api/songs, /api/albums, /api/artists
    ├── discover.ts        /api/charts, /api/trending, /api/radio
    ├── stream.ts          /api/stream, /api/proxy
    ├── info.ts            /api/lyrics, /api/artist/info
    └── feed.ts            /api/feed/*
```

## API Endpoints

### Search
| Endpoint | Description |
|----------|-------------|
| `/api/search?q=&filter=` | Search YouTube Music |
| `/api/yt_search?q=&filter=` | Search YouTube |
| `/api/search/suggestions?q=` | Autocomplete |

### Content
| Endpoint | Description |
|----------|-------------|
| `/api/songs/:videoId` | Song + artist/album links |
| `/api/albums/:browseId` | Album + tracks |
| `/api/artists/:browseId` | Artist + discography |
| `/api/playlists/:playlistId` | Playlist tracks |
| `/api/chain/:videoId` | Song → Artist → Albums |

### Discovery
| Endpoint | Description |
|----------|-------------|
| `/api/related/:videoId` | Related songs |
| `/api/radio?videoId=` | Radio mix |
| `/api/similar?title=&artist=` | Similar tracks |
| `/api/charts?country=` | Charts |
| `/api/trending?country=` | Trending |
| `/api/moods` | Mood categories |
| `/api/top/artists?country=` | Top artists |
| `/api/top/tracks?country=` | Top tracks |

### Streaming & Lyrics
| Endpoint | Description |
|----------|-------------|
| `/api/stream?id=` | Audio stream URLs |
| `/api/proxy?url=` | Audio proxy (CORS) |
| `/api/lyrics?title=&artist=` | Synced lyrics |

### Info
| Endpoint | Description |
|----------|-------------|
| `/api/artist/info?artist=` | Artist bio |
| `/api/track/info?title=&artist=` | Track info |

## Deploy

Uses the new [Deno Deploy](https://console.deno.com) platform (not Deploy Classic).

```bash
deno task deploy
```

> This project uses `Deno.serve()` as required by the new Deno Deploy.
> Deploy Classic (dash.deno.com) shuts down July 20, 2026.

## License

MIT
