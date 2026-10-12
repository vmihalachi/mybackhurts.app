# AGENTS.md — mybackhurts.app

The landing page of mybackhurts (public). The app's private repository mounts this one as a submodule at
`landing/`, and most changes are made from there (its `AGENTS.md`, `localization` skill and `scripts/verify.sh`
cover this page). Commit and push here first, then commit the new submodule pointer in the app repository.

- `index.html` is a `{{key}}` template filled from `src/i18n/<code>.json`; add new strings to `en.json` and
  translate them through the app repository's `localization` skill.
- `app-data/app.json` is a snapshot of the app's exercises and default interval. A build inside the app
  repository rewrites it; a standalone build (CI here) reads it. Never edit it by hand.
- No third-party scripts, fonts or requests: the CSP in the generated `_headers` has `connect-src 'none'`.
- Before pushing: `vp check && vp build`. `deploy.yml` deploys `master` to Cloudflare.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
