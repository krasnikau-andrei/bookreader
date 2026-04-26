import { test, expect } from 'vitest';

test('DOMParser availability', () => {
  console.log('1. globalThis.DOMParser:', typeof globalThis.DOMParser);
  console.log('2. global.DOMParser:', typeof global.DOMParser);
  console.log('3. DOMParser:', typeof DOMParser);
  expect(typeof DOMParser).toBe('function');
});
