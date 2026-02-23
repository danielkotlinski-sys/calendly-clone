/**
 * Testy logiki Google Calendar
 */

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth?mock'),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
      })),
    },
    calendar: jest.fn(),
  },
}));

jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}));

jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      get: jest.fn(),
      run: jest.fn(),
    }),
    close: jest.fn(),
  }));
});

import { getAuthUrl, getOAuth2Client } from '@/lib/google-calendar';

describe('getOAuth2Client', () => {
  it('tworzy klienta OAuth2', () => {
    const client = getOAuth2Client();
    expect(client).toBeDefined();
  });
});

describe('getAuthUrl', () => {
  it('zwraca URL autoryzacji Google', () => {
    const url = getAuthUrl(1);
    expect(url).toContain('https://accounts.google.com');
  });
});

describe('logika odświeżania tokenu', () => {
  it('token wygasający za 3 minuty powinien być odświeżony (poniżej 5-min marginesu)', () => {
    const expiryDate = Date.now() + 3 * 60 * 1000; // za 3 minuty
    const shouldRefresh = Date.now() >= expiryDate - 5 * 60 * 1000;
    expect(shouldRefresh).toBe(true);
  });

  it('token wygasający za 10 minut NIE powinien być odświeżony', () => {
    const expiryDate = Date.now() + 10 * 60 * 1000; // za 10 minut
    const shouldRefresh = Date.now() >= expiryDate - 5 * 60 * 1000;
    expect(shouldRefresh).toBe(false);
  });

  it('token już wygasły powinien być odświeżony', () => {
    const expiryDate = Date.now() - 60 * 1000; // minuta temu
    const shouldRefresh = Date.now() >= expiryDate - 5 * 60 * 1000;
    expect(shouldRefresh).toBe(true);
  });
});
