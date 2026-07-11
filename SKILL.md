---
name: markpdf-svelte
description: Best practices for @markpdf/svelte (createConvertStore). Use when integrating document conversion into a Svelte/SvelteKit app — store lifecycle, progress, key safety in SvelteKit.
---

# Best practices — @markpdf/svelte

## Store lifecycle

```svelte
<script lang="ts">
  import { MarkpdfClient, createConvertStore } from "@markpdf/svelte";
  import { PUBLIC_MARKPDF_API_KEY } from "$env/static/public";

  const client = new MarkpdfClient({ apiKey: PUBLIC_MARKPDF_API_KEY });
  const convertStore = createConvertStore(client);

  function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) convertStore.convert(file, { mode: "fast" });
  }
</script>
```

Create `client`/`convertStore` at module or component top-level, not inside `onFile` — recreating them per call throws away in-flight state and defeats the store's purpose.

## Key safety in SvelteKit

- `$env/static/public` / `PUBLIC_*` vars end up in the client bundle — only use that path if the key can be public.
- If the key must stay private, add a `+server.ts` route that imports `@markpdf/sdk` (not `@markpdf/svelte`) server-side, reads a private env var, and calls the API. The Svelte component then `fetch`es your own `+server.ts` route instead of using `createConvertStore` against the real API.

## Error handling

```svelte
{#if $convertStore.status === "error"}
  <p role="alert">{$convertStore.error?.message}</p>
{/if}
```

- `$convertStore.error` is a typed `MarkpdfError` — check `instanceof RateLimitError` for retry logic, don't parse `.message`.
- `.convert()` does not auto-poll 202 (it uses raw XHR for progress reporting) — for documents that might get queued, use `client.convertFromUrl(...)` directly instead of the store.

## Resources

- Docs: https://docs.markpdf.tech/docs/sdks/svelte
- See `AGENTS.md` in this folder.
