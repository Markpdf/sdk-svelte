# AGENTS.md — @markpdf/svelte

Guidance for AI agents generating or modifying code that uses this package.

## What this is

Svelte store over `@markpdf/sdk`. A browser client — the API key is visible in the bundle unless you serve it through a server-side SvelteKit route.

## Layout

```
src/
  store.ts   # createConvertStore(client) — ALL logic lives here
  index.ts   # re-exports createConvertStore + MarkpdfClient and types from @markpdf/sdk
```

## Public surface

- `new MarkpdfClient({ apiKey, baseUrl? })` (re-exported from `@markpdf/sdk`, not reimplemented here).
- `createConvertStore(client)` → a `Readable<ConvertState>` object with extra methods `.convert(file, options)` and `.reset()`. Used with `$` in templates: `$convertStore.status`, `$convertStore.progress`, `$convertStore.markdown`, `$convertStore.error`.

## Rules when generating code with this SDK

1. **Create the store ONCE per component/page**, usually at the top level of `<script>`, not inside an event handler — each call to `createConvertStore` creates an independent state.
2. **`ConvertState.status`** is exactly `"idle" | "uploading" | "converting" | "success" | "error"`.
3. **`.convert()` uses `XMLHttpRequest` internally** (for upload progress), not the plain `convertFile`/`convertFromUrl` from `@markpdf/sdk` — which means **it does not auto-poll 202**. If you need to handle documents that might get queued, use the raw `MarkpdfClient` (`client.convertFromUrl(...)`, which does auto-poll) instead of the store.
4. **In SvelteKit, if the key must stay private**, don't pass it as a `PUBLIC_*` env var to the client store — create a `+server.ts` endpoint that calls `@markpdf/sdk` server-side and `fetch` that endpoint from the component instead of using this package directly.
5. **`.reset()` returns the store to its initial state** — use it before a new conversion if you want to explicitly clear a previous `error`/`markdown` (it gets overwritten by `.convert()` anyway, but `.reset()` is more explicit in transitioning UIs).

## Commands

```bash
npm install
npm run build   # tsup
```

## Full reference

Public docs: https://docs.markpdf.tech/docs/sdks/svelte
