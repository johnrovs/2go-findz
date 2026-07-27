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
