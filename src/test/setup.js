
/**
 * Vitest setup — jest-dom matchers + matchMedia stub for MUI.
 */
import "@testing-library/jest-dom";
 
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
 
 
