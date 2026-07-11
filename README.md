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
