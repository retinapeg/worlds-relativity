import { expect, it } from 'vitest';
import { formatTime } from '../src/ui/formatTime';

it('carries rounded tenths into the next minute without displaying sixty seconds', () => {
  expect(formatTime(0)).toBe('00:00.0');
  expect(formatTime(59.94)).toBe('00:59.9');
  expect(formatTime(59.95)).toBe('01:00.0');
  expect(formatTime(59.99)).toBe('01:00.0');
  expect(formatTime(60)).toBe('01:00.0');
  expect(formatTime(3599.99)).toBe('60:00.0');
});
