import '@testing-library/jest-dom';

// Node 22+ defines a lazy global `localStorage`/`sessionStorage` getter that returns
// undefined (and warns) unless the process is started with --localstorage-file. Because
// it is already an own property of globalThis, Vitest's jsdom environment treats it as
// "already provided by the host" and skips wiring up jsdom's own implementation, so the
// global ends up unusable. Force the global storage objects to jsdom's real ones.
if (typeof globalThis.jsdom !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => globalThis.jsdom.window.localStorage,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get: () => globalThis.jsdom.window.sessionStorage,
  });
}

// jsdom does not implement IntersectionObserver, which Framer Motion's `whileInView`
// prop (used for scroll-triggered entrance animation on ProductCard/CategoryCard) needs
// at mount time. A no-op stub is sufficient for tests: Framer Motion animates via
// opacity/transform styles, never `display:none`, so content stays queryable by
// Testing Library regardless of whether the "in view" callback ever fires.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = IntersectionObserverStub;

// Recharts' ResponsiveContainer measures its container via ResizeObserver and
// getBoundingClientRect before rendering any chart content, and renders nothing if the
// measured size comes back zero. jsdom does not implement ResizeObserver and never
// performs real layout (every element reports a 0x0 rect by default), so both need
// stubbing for any chart to render its children during tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({
    width: 400,
    height: 240,
    top: 0,
    left: 0,
    bottom: 240,
    right: 400,
    x: 0,
    y: 0,
    toJSON() {},
  }),
});

// jsdom does not implement window.matchMedia, which HeroCarousel's reduced-motion
// detection needs at mount time (and which Framer Motion also checks internally via
// the legacy addListener/removeListener API, not just the modern
// addEventListener/removeEventListener pair). `matches: false` is a safe default —
// tests that specifically need reduced-motion behavior stub this themselves.
globalThis.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
});

// jsdom does not implement Element.scrollIntoView, which HomePage calls when arriving
// with a #catalog hash or when a category card is selected. A no-op stub lets tests spy
// on/mock it instead of erroring; it never performs real layout anyway.
Element.prototype.scrollIntoView = function scrollIntoView() {};
