# @markpdf/svelte

Svelte store for the [markpdf](https://markpdf.tech) API, built on `@markpdf/sdk`.

## Install

```bash
npm install @markpdf/svelte @markpdf/sdk
```

## Usage

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

<input type="file" on:change={onFile} />

{#if $convertStore.status === "uploading"}
  <progress value={$convertStore.progress} max="100" />
{/if}
{#if $convertStore.error}
  <p>{$convertStore.error.message}</p>
{/if}
{#if $convertStore.markdown}
  <pre>{$convertStore.markdown}</pre>
{/if}
```

Calling the API directly from the browser exposes the key to devtools. Use a key you're comfortable being public, or add a SvelteKit server route that proxies the request with a private key.

Full documentation: https://docs.markpdf.tech

## Store API

Create one store per flow with `createConvertStore(client)`. It exposes the readable state `{ status, progress, markdown, json, error }` plus `.convert(file, options?)` and `.reset()`. Status is one of `idle`, `uploading`, `converting`, `success`, or `error`; `markdown` and `json` are mutually exclusive.

The store uses `XMLHttpRequest` for upload progress and does not auto-poll a `202` job. For queued jobs or methods such as `convertFromUrl`, `pdfIndex`, and `waitForJob`, use the re-exported `MarkpdfClient` directly.

## Secure SvelteKit architecture

Do not put a private key in `$env/static/public`. Put `MARKPDF_API_KEY` in `$env/static/private`, call `@markpdf/sdk` from a `+server.ts` route, authenticate that route, validate size/type, and apply per-user quotas and rate limits. Browser validation is only a UX guardrail; repeat it on the server.

Treat converted Markdown as untrusted: sanitize it before `{@html ...}` and never concatenate it into an AI system prompt. Use short-lived signed URLs and redact their query strings, keys, file contents and outputs from logs.

## For developers and AI agents

Read [`AGENTS.md`](./AGENTS.md), [`SKILL.md`](./SKILL.md), and [`SECURITY.md`](./SECURITY.md). Create the store once, use camelCase options, handle all result shapes, and prefer a SvelteKit server route whenever credentials must remain private.

## Troubleshooting

- Store error outside a component flow: ensure `createConvertStore` receives a configured client.
- Upload stays queued: use the raw client and `waitForJob`, or a server route that auto-polls.
- Key visible in DevTools: it was imported from a public environment module; rotate it and move conversion server-side.

## S3/R2 uploads, downloads and database optimization

For production workloads, upload large files directly from the client to a private S3 or Cloudflare R2 bucket with a short-lived presigned `PUT` URL. Then call this SDK's URL-conversion method so the application server never buffers the full document. Large Markdown results can be written straight back to object storage with the SDK's output URL option where supported.

Recommended flow:

1. Authenticate and authorize the user.
2. Create a database row with a server-generated conversion ID and `uploading` status.
3. Generate a random tenant-scoped object key and a short-lived presigned upload URL.
4. Upload directly to private storage and verify object size/checksum server-side.
5. Reuse a completed conversion only when tenant, input SHA-256 and canonical options hash all match.
6. Convert from a signed input URL; use a signed output URL for large results.
7. Store status and object metadata in the database, while keeping large Markdown bodies in S3/R2.
8. Authorize downloads and return a short-lived signed `GET` URL or a hardened attachment response.
9. Expire temporary objects, abandoned multipart uploads and stale database rows automatically.

Do not use filenames, object URLs or multipart ETags as content identity. Use a verified checksum, normalize every output-affecting conversion option into the cache key, and isolate deduplication by tenant. Keep database indexes focused on tenant history, active jobs and expiry cleanup.

See [`STORAGE.md`](./STORAGE.md) for the full SQL model, partial indexes, idempotent state transitions, cache-key rules, S3/R2 permissions, CORS, multipart uploads, lifecycle policies, secure download headers and AI/RAG protections.
