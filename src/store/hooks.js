 
 
/**
 * Typed-style hooks without TypeScript: thin wrappers around react-redux.
 * `equalityFn` is optional — use it with memoized selectors (e.g. sidebar snapshot) to skip re-renders.
 */
import { useDispatch, useSelector } from "react-redux";
 
/** Returns the typed `dispatch` function for this store. */
export function useAppDispatch() {
  return useDispatch();
}
 
/** Subscribes to Redux state; pass `equalityFn` when the selected object is new each time but semantically equal. */
export function useAppSelector(selector, equalityFn) {
  return useSelector(selector, equalityFn);
}
 
