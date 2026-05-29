## Working agreement

**Plan before code.** For any task beyond a one-line change, output a numbered plan first (max 5 bullets: files you'll touch, approach, risks). Wait for "go" before writing code. Skip the plan only for trivial edits I explicitly mark as such.

**Don't fabricate.** If you don't know whether a function, file, type, or API exists, say so and check — don't invent it. No made-up imports, no guessed function signatures, no hallucinated config keys. When unsure, grep the codebase or ask.

**Verify, don't assume.** "It should work" is not done. Run the build, run the tests. If you can't run them, say "I haven't verified this — please run X." Never claim a fix works without evidence. For UI changes, exercise the feature in `ng serve` before reporting done.

**Stay in scope.** Do what I asked. Nothing more. If you spot something else worth fixing, mention it in one sentence at the end — don't fix it. Drive-by refactors are forbidden.

**Ask once, sharply.** If the request is ambiguous in a way that affects the implementation, ask one specific question before starting. Don't ask three. Don't ask vague ones. Don't guess and produce 200 lines of the wrong thing.

**Match the codebase.** Existing patterns win, even if you'd write it differently. Consistency over preference.

**Destructive ops require confirmation.** `rm -rf`, `git reset --hard`, `git push --force`, mass file deletion, rewriting Capacitor native projects — stop and confirm.

## How to talk to me

- No filler openers. No "Great question," "You're absolutely right," "I'd be happy to."
- No empty praise. Don't call code "clean," "elegant," or "great" without a specific reason — and lead with what's wrong before what's right.
- If the answer is "no" or "this won't work," that's the first sentence.
- Push back on bad ideas immediately, especially when I sound confident. Confidence is a signal to scrutinize.
- When you agree, say *why* in a way that adds something I didn't already say. Don't restate my framing.
- Be concise. Prose-heavy explanations of obvious code are noise.

## Project

DocMinds Hospital Admin Panel — web frontend with Angular SSR + optional Android shell via Capacitor. Surfaces appointment management, EMR, charts, signature capture, and PDF export.

## Stack

- Framework: Angular 18 (+ SSR via `@angular/ssr`, server bundle at `dist/.../server/server.mjs`)
- UI: PrimeNG 17, Angular Material 18 (CDK), PrimeFlex
- Charts: chart.js + ng2-charts, echarts + ngx-echarts
- Native shell: Capacitor 7 (Android only — `android/`)
- PDF/Render: jspdf, pdf-lib, pdfmake, html2canvas
- Misc: signature_pad + ngx-signaturepad, sweetalert2, exceljs, file-saver, luxon, moment-timezone, paper, nosleep.js
- Tests: jasmine + karma
- Package manager: npm

## Commands

```
install:    npm install
dev:        npm start                # ng serve --host 0.0.0.0 --disable-host-check
build:      npm run build            # ng build
watch:      npm run watch
test:       npm test                 # ng test (karma + jasmine)
ssr:        npm run serve:ssr:hospital_appointment_admin_panel
cap:        npx cap sync android | npx cap open android
```

A change isn't done until `ng build` passes. There is no separate `lint`/`typecheck` script — `ng build` is the typecheck.

## Conventions

- Standalone-component-first where the file already is standalone; don't mix paradigms within a feature.
- PrimeNG modules are imported per-component in the existing files — follow that pattern, don't introduce a global `SharedModule`.
- Environment values flow through `replace-env.js` at build time; don't hand-edit generated env files.
- SSR-incompatible APIs (e.g., direct `window`, `document` without checks) break the server build — guard with `isPlatformBrowser`.

## Landmines

- `replace-env.js` rewrites environment files during build — edits to generated env files are lost.
- `amplify.yml` configures AWS Amplify deploys; CI cares about it, treat as load-bearing.
- `server.ts` is the SSR entry; do not delete or rename without coordinating with `angular.json` SSR config.
- Capacitor `android/` is generated but committed — regenerating wipes manual `AndroidManifest.xml` tweaks.

## Off-limits

- `dist/`, `.angular/`, `node_modules/`, `android/build/`, `android/app/build/`
- Generated env files written by `replace-env.js`
- Capacitor native code under `android/` (unless I ask for a native change)
- Installing new dependencies without asking
