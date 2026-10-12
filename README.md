# mybackhurts.app

The landing page of [mybackhurts](https://mybackhurts.app), a menu bar app for macOS and Windows that reminds
you to stand up and move, and can count your reps from the webcam without anything leaving your computer.

The app itself lives in a private repository; this page is open source. It's plain HTML, CSS and a little
JavaScript, built with [Vite+](https://viteplus.dev/) into one page per language (17 of them), with no
third-party scripts, fonts or requests (`connect-src 'none'`).

## Build

```sh
vp install
vp dev      # http://localhost:5173
vp check    # format, lint, type check
vp build    # dist/
```

- `index.html` is a template: `{{key}}` placeholders are filled from `src/i18n/<language>.json`
  (`vite.config.ts`), and the build fails when a language is missing a key.
- `app-data/app.json` is what the page knows about the app: the exercises, their goals and translated
  names, and the default reminder interval. `app-sync.ts` fails the build when a move card disagrees with
  it. In the app repository this repo is mounted at `landing/`, and a build there rewrites the snapshot
  from the app's own files; commit it here when it changes.
- `og/` renders the social cards, icons and the printable poster at build time.

## Deploy

`.github/workflows/deploy.yml` checks and builds every push and pull request, and deploys `master` to a
Cloudflare Worker serving static assets (`wrangler.json`, with the headers and CSP in the generated
`_headers`).

## License

The code is MIT; the copy, illustrations, videos and brand are not. See [LICENSE](LICENSE).
