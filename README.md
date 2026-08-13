# 1.111B Class Domain Generator

Discovers and checks live availability of rare numeric `.xyz` domains (sequential, palindrome, prime, lucky-number, angel-number patterns, etc.) against the `.xyz` RDAP registry. Built with [Astro](https://astro.build) + [Bootstrap](https://getbootstrap.com), deployed as a static site to [Cloudflare Pages](https://pages.cloudflare.com).

Everything runs client-side — domain generation and RDAP availability checks happen in the browser, so there's no backend/API to deploy.

## Project structure

```text
/
├── public/                 static assets (favicon)
├── src/
│   ├── components/         Navbar, DomainSection, Footer (Astro components)
│   ├── layouts/             Layout.astro — HTML shell, Bootstrap + font imports
│   ├── pages/
│   │   └── index.astro      the single page
│   ├── scripts/
│   │   ├── generators.js    domain pattern generators (sequential, prime, lucky, ...)
│   │   ├── rdap.js          rate-limited RDAP availability lookup
│   │   ├── hunt.js          hunt-until-available / exhaustive-search strategies
│   │   ├── hunters.js       maps each pattern type to its hunt strategy
│   │   ├── render.js        builds each domain row's Bootstrap markup
│   │   └── main.js          wires up the UI (generate/refresh/recheck)
│   └── styles/
│       └── global.css       Bootstrap import + small overrides
├── astro.config.mjs
├── wrangler.toml            Cloudflare Pages config
└── package.json
```

## Commands

| Command             | Action                                             |
| :------------------- | :-------------------------------------------------- |
| `npm install`         | Install dependencies                                 |
| `npm run dev`          | Start local dev server at `localhost:4321`            |
| `npm run build`        | Build the static site to `./dist/`                    |
| `npm run preview`      | Preview the production build locally                  |
| `npm run deploy`       | Build, then deploy `./dist/` to Cloudflare Pages via Wrangler |

## Deploying to Cloudflare Pages

**Option A — Git integration (recommended):** push this repo to GitHub/GitLab, then in the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**, select the repo, and set:

- Build command: `npm run build`
- Build output directory: `dist`

Every push to the connected branch will trigger a new deploy automatically.

**Option B — CLI deploy with Wrangler:**

```sh
npx wrangler login   # one-time browser auth
npm run deploy        # builds and runs `wrangler pages deploy dist`
```

The project name Wrangler uses is set in `wrangler.toml`.
