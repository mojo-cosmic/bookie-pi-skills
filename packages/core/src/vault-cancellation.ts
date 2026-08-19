export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new DOMException("Vault validation was aborted.", "AbortError");
  }
}
