import { parentPort } from "node:worker_threads";

import { analyzeMarkdown } from "./vault-markdown-analysis.js";

const port = parentPort;
if (port === null) throw new Error("Markdown worker requires a parent port");

port.once("message", (body: unknown) => {
  if (typeof body !== "string") {
    port.postMessage({ ok: false });
    return;
  }
  try {
    port.postMessage({ ok: true, analysis: analyzeMarkdown(body) });
  } catch {
    port.postMessage({ ok: false });
  }
});
