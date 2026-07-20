import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  feedUrl,
  googleSubscribeUrl,
  newFeedToken,
  outlookSubscribeUrl,
  webcalUrl,
} from '../src/services/calendarFeed';

const token = 'ab'.repeat(16);

beforeAll(() => {
  vi.stubEnv('VITE_PUSH_API', 'https://push.example.com');
});

describe('calendarFeed urls', () => {
  it('generates 32-hex tokens', () => {
    expect(newFeedToken()).toMatch(/^[a-f0-9]{32}$/);
    expect(newFeedToken()).not.toBe(newFeedToken());
  });
  it('builds the .ics and webcal URLs from the API base', () => {
    expect(feedUrl(token)).toMatch(new RegExp(`/api/calendar/${token}\\.ics$`));
    expect(webcalUrl(token).startsWith('webcal://')).toBe(true);
  });
  it('pre-fills the subscribe pages of Google and Outlook', () => {
    expect(googleSubscribeUrl(token)).toContain('calendar.google.com/calendar/r?cid=webcal');
    expect(outlookSubscribeUrl(token, 'live')).toContain('outlook.live.com');
    expect(outlookSubscribeUrl(token, 'office')).toContain('outlook.office.com');
    expect(outlookSubscribeUrl(token, 'live')).toContain('name=BlockCast');
  });
});
