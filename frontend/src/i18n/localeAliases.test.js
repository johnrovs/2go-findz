import { describe, expect, it } from 'vitest';
import { normalizeDetectedLocale } from './localeAliases.js';

const SUPPORTED = ['en-US', 'es-US', 'fil-PH', 'zh-Hans', 'vi'];

describe('normalizeDetectedLocale', () => {
  it('returns an exact supported code unchanged', () => {
    expect(normalizeDetectedLocale('es-US', SUPPORTED)).toBe('es-US');
  });

  it('matches a supported code case-insensitively', () => {
    expect(normalizeDetectedLocale('ES-US', SUPPORTED)).toBe('es-US');
  });

  it('maps common Spanish browser variants to es-US', () => {
    expect(normalizeDetectedLocale('es', SUPPORTED)).toBe('es-US');
    expect(normalizeDetectedLocale('es-MX', SUPPORTED)).toBe('es-US');
    expect(normalizeDetectedLocale('es-ES', SUPPORTED)).toBe('es-US');
  });

  it('maps Filipino/Tagalog browser variants to fil-PH', () => {
    expect(normalizeDetectedLocale('fil', SUPPORTED)).toBe('fil-PH');
    expect(normalizeDetectedLocale('tl', SUPPORTED)).toBe('fil-PH');
  });

  it('maps Chinese browser variants to zh-Hans', () => {
    expect(normalizeDetectedLocale('zh', SUPPORTED)).toBe('zh-Hans');
    expect(normalizeDetectedLocale('zh-CN', SUPPORTED)).toBe('zh-Hans');
    expect(normalizeDetectedLocale('zh-SG', SUPPORTED)).toBe('zh-Hans');
  });

  it('maps Vietnamese browser variants to vi', () => {
    expect(normalizeDetectedLocale('vi-VN', SUPPORTED)).toBe('vi');
  });

  it('returns an unrecognized language unchanged, letting fallbackLng take over', () => {
    expect(normalizeDetectedLocale('de-DE', SUPPORTED)).toBe('de-DE');
  });

  it('returns falsy input unchanged', () => {
    expect(normalizeDetectedLocale(undefined, SUPPORTED)).toBe(undefined);
  });
});
