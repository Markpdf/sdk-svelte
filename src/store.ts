import { MarkpdfClient, MarkpdfError, errorForStatus, type ConvertOptions, type JsonResult } from "@markpdf/sdk";
import { writable, type Readable } from "svelte/store";

export type ConvertStatus = "idle" | "uploading" | "converting" | "success" | "error";

export interface ConvertState {
  status: ConvertStatus;
  progress: number;
  markdown: string | null;
  json: JsonResult | null;
  error: MarkpdfError | null;
}

export interface ConvertStore extends Readable<ConvertState> {
  convert(file: File, options?: ConvertOptions): Promise<void>;
  reset(): void;
}

const initialState: ConvertState = {
  status: "idle",
  progress: 0,
  markdown: null,
  json: null,
  error: null,
};

/**
 * Creates a Svelte store that drives a file upload to markpdf with progress
 * reporting (via `XMLHttpRequest`, since `fetch` has no upload progress API).
 *
 * ```svelte
 * <script>
 *   import { createConvertStore } from "@markpdf/svelte";
 *   const client = new MarkpdfClient({ apiKey: PUBLIC_MARKPDF_API_KEY });
 *   const convertStore = createConvertStore(client);
 *
 *   function onFile(e) {
 *     convertStore.convert(e.target.files[0], { mode: "fast" });
 *   }
 * </script>
 *
 * <input type="file" on:change={onFile} />
 * {#if $convertStore.status === "uploading"}<progress value={$convertStore.progress} max={100} />{/if}
 * {#if $convertStore.markdown}<pre>{$convertStore.markdown}</pre>{/if}
 * ```
 */
export function createConvertStore(client: MarkpdfClient): ConvertStore {
  const { subscribe, set, update } = writable<ConvertState>(initialState);

  function convert(file: File, options: ConvertOptions = {}): Promise<void> {
    set({ ...initialState, status: "uploading" });

    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file, file.name);

      const params = new URLSearchParams({
        input_format: options.inputFormat ?? "auto",
        mode: options.mode ?? "fast",
        clean: String(options.clean ?? true),
        ocr: String(options.ocr ?? false),
        image_ocr: String(options.imageOcr ?? false),
        hybrid_ocr: String(options.hybridOcr ?? false),
        response_format: options.responseFormat ?? "markdown",
        slim: String(options.slim ?? false),
        ...(options.pages ? { pages: options.pages } : {}),
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${client.baseUrl}/convert?${params.toString()}`);
      xhr.setRequestHeader("x-api-key", client.apiKey);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          update((s) => ({ ...s, progress: Math.round((event.loaded / event.total) * 100) }));
        }
      };

      xhr.onloadstart = () => update((s) => ({ ...s, status: "converting" }));

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader("content-type") ?? "";
        if (xhr.status >= 400) {
          const detail = contentType.includes("application/json") ? JSON.parse(xhr.responseText) : xhr.responseText;
          const err = errorForStatus(xhr.status, detail);
          set({ ...initialState, status: "error", error: err });
          reject(err);
          return;
        }
        if (contentType.includes("application/json")) {
          const json = JSON.parse(xhr.responseText) as JsonResult;
          set({ ...initialState, status: "success", progress: 100, json });
        } else {
          set({ ...initialState, status: "success", progress: 100, markdown: xhr.responseText });
        }
        resolve();
      };

      xhr.onerror = () => {
        const err = new MarkpdfError("Network error while uploading");
        set({ ...initialState, status: "error", error: err });
        reject(err);
      };

      xhr.send(form);
    });
  }

  function reset(): void {
    set(initialState);
  }

  return { subscribe, convert, reset };
}
