// Vitest setup file
import '@testing-library/jest-dom/vitest';
import './prisma/singleton';
import { vi } from 'vitest';
import messages from '@/messages/en.json';
import type { PropsWithChildren } from 'react';

class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}

function resolveMessage(namespace: string, key: string) {
  const root = (messages as Record<string, unknown>)[namespace] as
    | Record<string, unknown>
    | undefined;

  if (!root) {
    return undefined;
  }

  return key
    .split('.')
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[part];
    }, root);
}

function formatMessage(
  template: string,
  values?: Record<string, string | number | Date>,
) {
  const scopedValues = values ?? {};

  const withPlurals = template.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^{}]*)\}\s*other\s*\{([^{}]*)\}\}/g,
    (_, name: string, one: string, other: string) => {
      const rawValue = scopedValues[name];
      const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      const branch = numericValue === 1 ? one : other;
      return branch.replace(/#/g, String(rawValue ?? ''));
    },
  );

  return withPlurals.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = scopedValues[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: PropsWithChildren) => children,
  useLocale: () => 'en',
  useTranslations: (namespace: string) => {
    return (key: string, values?: Record<string, string | number | Date>) => {
      const message = resolveMessage(namespace, key);

      if (typeof message !== 'string') {
        return key;
      }

      return formatMessage(message, values);
    };
  },
}));

// Mock browser globals for Radix UI
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = MockPointerEvent as any;
}
window.scrollTo = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });

