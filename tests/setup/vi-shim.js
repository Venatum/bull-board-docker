// Preload shim to provide a Vitest-like `vi` API on top of Bun's test runner
import { mock as bunMock, spyOn as bunSpyOn, jest as bunJest } from 'bun:test';

const vi = {};

// Prefer Bun's Jest-compat layer if available
if (bunJest) {
  vi.fn = bunJest.fn.bind(bunJest);
  vi.spyOn = bunJest.spyOn.bind(bunJest);
  vi.clearAllMocks = bunJest.clearAllMocks ? bunJest.clearAllMocks.bind(bunJest) : () => {};
  vi.resetModules = bunJest.resetModules ? bunJest.resetModules.bind(bunJest) : () => {};
  // Module mocking via bun's jest compat if present
  if (typeof bunJest.mock === 'function') {
    const normalize = (s) => (s && (/^\.{1,2}\//.test(s) && !/\.([cm]?js|ts|tsx|jsx)$/.test(s))) ? `${s}.js` : s;
    vi.mock = (specifier, factory) => bunJest.mock(normalize(specifier), factory);
    vi.doMock = (specifier, factory) => bunJest.mock(normalize(specifier), factory);
    vi.unmock = bunJest.unmock ? bunJest.unmock.bind(bunJest) : () => {};
  } else if (bunJest.doMock) {
    const normalize = (s) => (s && (/^\.{1,2}\//.test(s) && !/\.([cm]?js|ts|tsx|jsx)$/.test(s))) ? `${s}.js` : s;
    vi.doMock = (specifier, factory) => bunJest.doMock(normalize(specifier), factory);
  }
}

// Fallbacks to Bun's native mock helpers
if (!vi.fn) vi.fn = bunMock.fn.bind(bunMock);
if (!vi.spyOn) vi.spyOn = bunSpyOn;
if (!vi.clearAllMocks) vi.clearAllMocks = () => {};
if (!vi.resetModules) vi.resetModules = () => {};
if (!vi.mock && typeof bunMock.module === 'function') {
  const normalize = (s) => (s && (/^\.{1,2}\//.test(s) && !/\.([cm]?js|ts|tsx|jsx)$/.test(s))) ? `${s}.js` : s;
  vi.mock = (specifier, factory) => bunMock.module(normalize(specifier), factory);
}

// Module mocking support via Bun's mock.module API (Bun >=1.1)
if (!vi.doMock && typeof bunMock.module === 'function') {
  const normalize = (s) => (s && (/^\.{1,2}\//.test(s) && !/\.([cm]?js|ts|tsx|jsx)$/.test(s))) ? `${s}.js` : s;
  vi.doMock = (specifier, factory) => bunMock.module(normalize(specifier), factory);
}

// Expose globally for tests written for Vitest
globalThis.vi = vi;
