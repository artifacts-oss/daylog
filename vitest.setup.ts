// Vitest setup file
import '@testing-library/jest-dom/vitest';
import './prisma/singleton';
import { vi } from 'vitest';

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

// Mock browser globals for Radix UI
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = MockPointerEvent as any;
}
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
