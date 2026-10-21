import { describe, expect, it } from 'vitest';
import { buildAiUserPrompt, isAiAction } from './ai';

describe('ai helpers', () => {
  it('wraps the note and appends the action instruction', () => {
    const prompt = buildAiUserPrompt('summarize', '# Title');
    expect(prompt.startsWith('<note>\n# Title\n</note>\n\n')).toBe(true);
    expect(prompt).toContain('Summary');
  });

  it('uses the user instruction for custom actions', () => {
    expect(buildAiUserPrompt('custom', 'Hi', '  translate  ')).toBe(
      '<note>\nHi\n</note>\n\ntranslate',
    );
  });

  it('validates actions', () => {
    expect(isAiAction('improve')).toBe(true);
    expect(isAiAction('drop tables')).toBe(false);
    expect(isAiAction(undefined)).toBe(false);
  });
});
