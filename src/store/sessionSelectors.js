
 
// /**
//  * Narrow Redux selectors so ChatPanel does not re-render on every token appended to a *background* session.
//  */
// import { createSelector } from "@reduxjs/toolkit";
 
// export const selectActiveSessionId = (state) => state.session.activeSessionId;
 
// export const selectActiveSession = createSelector(
//   [(state) => state.session.sessions, (state) => state.session.activeSessionId],
//   (sessions, activeId) => (activeId ? sessions.find((s) => s.id === activeId) : undefined),
// );
 
// /**
//  * Sidebar list metadata only — ignores `messages` / `live` churn so background WebSocket streams
//  * do not force the whole chat list to re-render (keeps chat switching snappy during multitasking).
//  */
// export function selectSessionSidebarSnapshot(state) {
//   const { sessions, activeSessionId } = state.session;
//   return {
//     activeSessionId,
//     sessionCount: sessions.length,
//     rows: sessions.map((s) => ({
//       id: s.id,
//       title: s.title,
//       favorite: s.favorite,
//       updatedAt: s.updatedAt,
//     })),
//   };
// }
 
// export function sessionsSidebarSnapshotEqual(a, b) {
//   if (a === b) return true;
//   if (!a || !b) return false;
//   if (a.activeSessionId !== b.activeSessionId || a.sessionCount !== b.sessionCount) return false;
//   const ra = a.rows;
//   const rb = b.rows;
//   if (ra.length !== rb.length) return false;
//   for (let i = 0; i < ra.length; i++) {
//     if (
//       ra[i].id !== rb[i].id ||
//       ra[i].title !== rb[i].title ||
//       ra[i].favorite !== rb[i].favorite ||
//       ra[i].updatedAt !== rb[i].updatedAt
//     ) {
//       return false;
//     }
//   }
//   return true;
// }
 import { createSelector } from "@reduxjs/toolkit";

/**
 * ============================================================
 * BASIC SELECTORS
 * ============================================================
 */

/** Get currently active session ID */
export const selectActiveSessionId = (state) =>
  state.session.activeSessionId;

/**
 * ============================================================
 * ACTIVE SESSION (MEMOIZED)
 * ============================================================
 *
 * Only recalculates when:
 * - sessions change
 * - activeSessionId changes
 *
 * Prevents unnecessary re-renders
 */
export const selectActiveSession = createSelector(
  [
    (state) => state.session.sessions,
    (state) => state.session.activeSessionId,
  ],
  (sessions, activeId) => {
    if (!activeId) return undefined;

    return sessions.find((s) => s.id === activeId);
  }
);

/**
 * ============================================================
 * SIDEBAR SNAPSHOT (PERFORMANCE OPTIMIZED)
 * ============================================================
 *
 * WHY this exists:
 * - Messages stream constantly (tokens)
 * - We DON'T want sidebar to re-render for that
 *
 * So we only expose:
 * - id
 * - title
 * - favorite
 * - updatedAt
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

/**
 * ============================================================
 * CUSTOM EQUALITY CHECK
 * ============================================================
 *
 * Used in:
 * useSelector(selector, equalityFn)
 *
 * Prevents re-render unless something IMPORTANT changed
 */
export function sessionsSidebarSnapshotEqual(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return false;

  // Fast checks first
  if (
    prev.activeSessionId !== next.activeSessionId ||
    prev.sessionCount !== next.sessionCount
  ) {
    return false;
  }

  const a = prev.rows;
  const b = next.rows;

  if (a.length !== b.length) return false;

  // Deep compare rows
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].title !== b[i].title ||
      a[i].favorite !== b[i].favorite ||
      a[i].updatedAt !== b[i].updatedAt
    ) {
      return false;
    }
  }

  return true;
}