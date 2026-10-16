# Drinking Games for 4

A local, browsable library of drinking games that work with exactly four people. No backend, no accounts, no runtime requests to anything but `localhost`.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (normally http://localhost:5173). The dev server also runs the room server for the multi-phone games, so everything works locally with no account.

To let phones on your wifi join a room while you develop, run `npm run dev -- --host` and share the network address Vite prints instead of localhost.

`npm run build` writes the site to `dist/client/` and the Worker to `dist/drinking_games/`; `npm run preview` serves the built output through the Workers runtime.

## Built-in games

The `/play` section has games built into the site, replacing apps that no longer exist:

- **Drink Roulette** (`/play/roulette`): one phone, a spinnable wheel.
- **Drinkopoly** (`/play/board`): one phone, a 24-square board game.
- **Party Room** (`/play/room`): everyone on their own phone, joined by a 4-letter code. Prompts (most likely to, never have I ever, would you rather, dares, truths, rules) and mini-games (reaction, tap race, hold steady, quick math). The host picks Spicy or Tame.

Content lives in `shared/content.ts`. Game logic for the room is in `shared/game.ts` and runs on the server; the client only renders state.

## Deploying

The site and the room server deploy together as one Cloudflare Worker (free plan is enough; rooms use Durable Objects with SQLite storage, which the free plan includes).

```bash
npx wrangler login
npm run deploy
```

The first command opens a browser to authorize wrangler against your Cloudflare account. The second builds and deploys; wrangler prints the public `*.workers.dev` URL. Re-run `npm run deploy` after any change.

## Where the data lives

- `drinking-games.md` is the seed. It is only read by the parser.
- `src/data/games.json` is the source of truth the app renders.
- `src/data/types.ts` documents every field.

Each game has the seed fields (`id`, `name`, `category`, `subcategory`, `needs`, `vibe`, `style[]`, `howToPlay`, `tip`) plus research fields (`setup[]`, `rules[]`, `drinkTriggers[]`, `variations[]`, `watchOut`, `duration`, `playerSweetSpot`, `links[]`, `notes`, `source`).

`source` is `"seed"` for games that came from the markdown and `"added"` for games found during research. Added games are flagged in the UI and can be filtered with "Added by research" so you can review them. Links carry `verified: "fetched"` when the URL was actually loaded and checked, or `"unverified"` when it was not.

## Adding games to the markdown

Add the entry to `drinking-games.md` in the same shape as the others, then:

```bash
npm run parse
```

The parser rewrites the seed fields for every game from the markdown and keeps every other field already present in `games.json`. Games that exist only in the JSON (`source: "added"`) are kept and stay next to the rest of their subcategory. Renaming a game in the markdown changes its id, so its enrichment will be orphaned; rename the `id` in the JSON too if you do that.

## Merging more research

`scripts/merge-enrichment.ts` takes JSON files shaped like `[{ "id": "...", "rules": [...], ... }]` and merges them into `games.json` without touching seed fields. Objects with an unknown id are appended as new games with `source: "added"`.

```bash
npm run merge-enrichment path/to/file.json
```
