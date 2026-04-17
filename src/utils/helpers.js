 
 
/**
 * Small shared helpers: ids, timestamps, export text, search escape, file sizes.
 */
 
/** @returns {string} */
export function generateId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
 
/** Relative “time ago” label for list UI. */
export function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
 
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
 
/** Full locale date + time for message headers. */
export function formatMessageDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
 
/** Elapsed ms → “12s” or “3m 4s” for optional timers. */
export function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
 
/**
 * Plain-text export of the whole thread (Copy chat / download).
 * @param {Array<{ role: string, content: string, timestamp: number }>} messages
 */
export function exportConversationText(messages) {
  return messages
    .map(
      (m) =>
        `[${m.role === "user" ? "You" : "Assistant"}] ${new Date(m.timestamp).toLocaleString()}\n${m.content}\n`,
    )
    .join("\n---\n\n");
}
 
/** Escape user search input before building a RegExp. */
export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
 
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
 
/** Heuristic for “long message” UI (expand/collapse). */
export function isLargeContent(text) {
  return text.length > 500 || text.split("\n").length > 15;
}
 
