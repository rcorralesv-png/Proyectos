import { describe, expect, it } from 'vitest';
import { getGradeFeedback } from '../src/grade-feedback.js';

describe('grade feedback boundaries', () => {
  it.each([
    [0, 'F', 'error'], [49, 'F', 'error'],
    [50, 'D-', 'error'], [59, 'D-', 'error'],
    [60, 'D', 'warning'], [69, 'D', 'warning'],
    [70, 'C', 'warning'], [79, 'C', 'warning'],
    [80, 'B', 'success'], [89, 'B', 'success'],
    [90, 'A', 'success'], [99, 'A', 'success'],
    [100, 'S', 'success'],
  ])('%i%% keeps grade %s and uses the %s tone', (pct, grade, tone) => {
    expect(getGradeFeedback(pct)).toMatchObject({ grade, tone });
  });

  it('provides text and an emoji at every score, without relying on color alone', () => {
    for (let pct = 0; pct <= 100; pct++) {
      const { label, emoji, message } = getGradeFeedback(pct);
      expect(label.trim()).not.toBe('');
      expect(emoji).toMatch(/\p{Extended_Pictographic}/u);
      expect(message.trim()).not.toBe('');
    }
  });
});
