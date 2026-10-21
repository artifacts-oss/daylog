import { describe, expect, it } from 'vitest';
import { parseId } from './parseId';

describe('parseId', () => {
  it('parses decimal digits', () => {
    expect(parseId('12')).toBe(12);
  });

  it.each(['12abc', '', ' 12', '-1', '1.5', '9007199254740993'])(
    'rejects %j',
    (value) => {
      expect(parseId(value)).toBeNaN();
    },
  );
});
