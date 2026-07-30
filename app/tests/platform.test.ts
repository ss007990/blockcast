import { describe, expect, it } from 'vitest';
import { isApplePlatform } from '../src/lib/platform';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  // iPadOS 13+ desktop-mode UA is indistinguishable from a Mac — both are Apple.
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
};

describe('isApplePlatform', () => {
  it('detects iPhone, iPad and Mac', () => {
    expect(isApplePlatform(UA.iphone)).toBe(true);
    expect(isApplePlatform(UA.ipad)).toBe(true);
    expect(isApplePlatform(UA.ipadDesktopMode)).toBe(true);
    expect(isApplePlatform(UA.macChrome)).toBe(true);
  });

  it('rejects Windows and Android', () => {
    expect(isApplePlatform(UA.windowsChrome)).toBe(false);
    expect(isApplePlatform(UA.android)).toBe(false);
  });
});
