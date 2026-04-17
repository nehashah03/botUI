
 
/**
 * Narrow Redux selectors so ChatPanel does not re-render on every token appended to a *background* session.
 */
import { createSelector } from "@reduxjs/toolkit";
 
export const selectActiveSessionId = (state) => state.session.activeSessionId;
 
export const selectActiveSession = createSelector(
  [(state) => state.session.sessions, (state) => state.session.activeSessionId],
  (sessions, activeId) => (activeId ? sessions.find((s) => s.id === activeId) : undefined),
);
 
/**
 * Sidebar list metadata only — ignores `messages` / `live` churn so background WebSocket streams
 * do not force the whole chat list to re-render (keeps chat switching snappy during multitasking).
 */
export function selectSessionSidebarSnapshot(state) {
  const { sessions, activeSessionId } = state.session;
  return {
    activeSessionId,
    sessionCount: sessions.length,
    rows: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      favorite: s.favorite,
      updatedAt: s.updatedAt,
    })),
  };
}
 
export function sessionsSidebarSnapshotEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.activeSessionId !== b.activeSessionId || a.sessionCount !== b.sessionCount) return false;
  const ra = a.rows;
  const rb = b.rows;
  if (ra.length !== rb.length) return false;
  for (let i = 0; i < ra.length; i++) {
    if (
      ra[i].id !== rb[i].id ||
      ra[i].title !== rb[i].title ||
      ra[i].favorite !== rb[i].favorite ||
      ra[i].updatedAt !== rb[i].updatedAt
    ) {
      return false;
    }
  }
  return true;
}
 