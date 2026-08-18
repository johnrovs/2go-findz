import { describe, expect, it, vi, beforeEach } from 'vitest';
import api, { normalizeError } from './api.js';

describe('normalizeError', () => {
  it('extracts field errors from a validation error response', () => {
    const error = { response: { data: { message: 'Validation failed.', errors: { name: 'Name is required.' } } } };
    expect(normalizeError(error)).toEqual({ message: 'Validation failed.', fieldErrors: { name: 'Name is required.' } });
  });

  it('extracts a plain message when there are no field errors', () => {
    const error = { response: { data: { message: 'Invalid username or password.' } } };
    expect(normalizeError(error)).toEqual({ message: 'Invalid username or password.', fieldErrors: null });
  });

  it('falls back to a generic message when there is no response', () => {
    const error = {};
    expect(normalizeError(error)).toEqual({ message: 'Network error. Please try again.', fieldErrors: null });
  });
});

describe('api request interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches the Authorization header when a token is stored', async () => {
    localStorage.setItem('token', 'test-token-123');
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await api.get('/some-endpoint');

    expect(capturedConfig.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('does not attach an Authorization header when no token is stored', async () => {
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await api.get('/some-endpoint');

    expect(capturedConfig.headers.Authorization).toBeUndefined();
  });
});

describe('api response interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears stored auth on a 401 response', async () => {
    localStorage.setItem('token', 'stale-token');
    localStorage.setItem('user', JSON.stringify({ username: 'johnrovs' }));
    // jsdom's Location.assign is a non-configurable own property, so vi.spyOn cannot
    // patch it in place; vi.stubGlobal replaces the whole `location` global instead,
    // which is Vitest's supported mechanism for this exact case.
    const assignMock = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignMock });

    api.defaults.adapter = async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401, data: { message: 'Authentication is required to access this resource.' } };
      throw error;
    };

    await expect(api.get('/admin/products')).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    vi.unstubAllGlobals();
  });
});
