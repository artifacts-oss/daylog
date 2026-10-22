import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocaleStorageSync from './LocaleStorageSync';
import { localeStorageKey } from '@/i18n/config';

let mockLocale = 'en';

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
}));

describe('LocaleStorageSync', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocale = 'en';
  });

  it('persists the active locale and renders nothing', () => {
    const { container } = render(<LocaleStorageSync />);

    expect(localStorage.getItem(localeStorageKey)).toBe('en');
    expect(container).toBeEmptyDOMElement();
  });

  it('updates storage when the locale changes', () => {
    const { rerender } = render(<LocaleStorageSync />);

    mockLocale = 'es';
    rerender(<LocaleStorageSync />);

    expect(localStorage.getItem(localeStorageKey)).toBe('es');
  });
});
