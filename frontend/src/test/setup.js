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
