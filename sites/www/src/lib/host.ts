// The agna and velouri workers ship this same SPA. The hostname decides
// which product the shell presents.

export function isVelouriHost(hostname?: string): boolean {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return host === "velouri.agnamo.com" || host.startsWith("velouri.");
}
