// Real provider integration point: swap the body of this function for a
// call into GA4/GTM/whatever is chosen later. Every call site in this
// codebase already passes the full event name + structured payload;
// nothing else needs to change when a provider is wired in.
export function trackEvent(name, payload = {}) {
  try {
    if (import.meta.env.DEV) {
      console.info('[analytics]', name, payload);
    }
  } catch {
    // Never let analytics break the page.
  }
}
