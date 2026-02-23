/**
 * Testy API /api/bookings
 * Mockujemy bazę danych, Google Calendar i Resend - testujemy tylko logikę route'a
 */

// Mocki zewnętrznych zależności
jest.mock('@/lib/db', () => ({
  getUserById: jest.fn(),
  getMeetingSettings: jest.fn(),
  isTimeSlotAvailable: jest.fn(),
  createBooking: jest.fn(),
  getBookingsByUserId: jest.fn(),
}));

jest.mock('@/lib/google-calendar', () => ({
  isCalendarConnected: jest.fn(),
  createCalendarEvent: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendBookingEmails: jest.fn(),
  sendOrganizerNotification: jest.fn(),
  sendErrorAlert: jest.fn(),
}));

import { POST, GET } from '@/app/api/bookings/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import * as calendar from '@/lib/google-calendar';
import * as email from '@/lib/email';

const mockEmail = email as jest.Mocked<typeof email>;

const mockUser = {
  id: 1,
  username: 'daniel',
  email: 'daniel@example.com',
  name: 'Daniel',
  created_at: '2026-01-01',
};

const mockBooking = {
  id: 42,
  user_id: 1,
  attendee_name: 'Jan Kowalski',
  attendee_email: 'jan@example.com',
  booking_date: '2026-03-10',
  booking_time: '10:00',
  duration: 30,
  created_at: '2026-02-23',
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/bookings', () => {
  const validBody = {
    user_id: 1,
    attendee_name: 'Jan Kowalski',
    attendee_email: 'jan@example.com',
    booking_date: '2026-03-10',
    booking_time: '10:00',
    duration: 30,
  };

  it('tworzy rezerwację i event w kalendarzu gdy Google Calendar jest połączony', async () => {
    (db.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (db.isTimeSlotAvailable as jest.Mock).mockResolvedValue(true);
    (db.createBooking as jest.Mock).mockResolvedValue(mockBooking);
    (calendar.isCalendarConnected as jest.Mock).mockResolvedValue(true);
    (calendar.createCalendarEvent as jest.Mock).mockResolvedValue({
      eventId: 'cal-123',
      meetLink: 'https://meet.google.com/abc',
    });

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.google_calendar_event_id).toBe('cal-123');
    expect(data.google_meet_link).toBe('https://meet.google.com/abc');
    expect(calendar.createCalendarEvent).toHaveBeenCalledTimes(1);
    expect(email.sendOrganizerNotification).toHaveBeenCalledTimes(1); // zawsze powiadamiamy organizatora
    expect(email.sendBookingEmails).not.toHaveBeenCalled(); // uczestnik przez GC, nie Resend
  });

  it('wysyła email przez Resend gdy Google Calendar nie jest połączony', async () => {
    (db.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (db.isTimeSlotAvailable as jest.Mock).mockResolvedValue(true);
    (db.createBooking as jest.Mock).mockResolvedValue(mockBooking);
    (calendar.isCalendarConnected as jest.Mock).mockResolvedValue(false);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(201);
    expect(calendar.createCalendarEvent).not.toHaveBeenCalled();
    expect(email.sendOrganizerNotification).toHaveBeenCalledTimes(1); // zawsze
    expect(email.sendBookingEmails).toHaveBeenCalledTimes(1); // fallback do uczestnika gdy brak GC
    expect(email.sendBookingEmails).toHaveBeenCalledWith(mockUser, mockBooking);
  });

  it('wysyła alert i email przez Resend gdy tworzenie eventu kalendarza się nie powiedzie', async () => {
    (db.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (db.isTimeSlotAvailable as jest.Mock).mockResolvedValue(true);
    (db.createBooking as jest.Mock).mockResolvedValue(mockBooking);
    (calendar.isCalendarConnected as jest.Mock).mockResolvedValue(true);
    (calendar.createCalendarEvent as jest.Mock).mockResolvedValue(null); // zwraca null = failure

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(201); // booking nadal sukces
    expect(email.sendErrorAlert).toHaveBeenCalledTimes(1);
    expect(email.sendBookingEmails).toHaveBeenCalledTimes(1); // fallback do Resend
  });

  it('wysyła alert gdy createCalendarEvent rzuca wyjątek', async () => {
    (db.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (db.isTimeSlotAvailable as jest.Mock).mockResolvedValue(true);
    (db.createBooking as jest.Mock).mockResolvedValue(mockBooking);
    (calendar.isCalendarConnected as jest.Mock).mockResolvedValue(true);
    (calendar.createCalendarEvent as jest.Mock).mockRejectedValue(new Error('invalid_grant'));

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(201);
    expect(email.sendErrorAlert).toHaveBeenCalledTimes(1);
    expect(email.sendBookingEmails).toHaveBeenCalledTimes(1); // fallback do Resend
  });

  it('zwraca 409 gdy termin jest zajęty', async () => {
    (db.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (db.getMeetingSettings as jest.Mock).mockResolvedValue({ duration: 30 });
    (db.isTimeSlotAvailable as jest.Mock).mockResolvedValue(false);

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('Ten termin jest już zajęty');
  });

  it('zwraca 404 gdy użytkownik nie istnieje', async () => {
    (db.getUserById as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Użytkownik nie został znaleziony');
  });

  it('zwraca 400 dla niepoprawnego emaila uczestnika', async () => {
    const res = await POST(makeRequest({ ...validBody, attendee_email: 'niepoprawnyelmail' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Błąd walidacji');
  });

  it('zwraca 400 dla niepoprawnego formatu daty', async () => {
    const res = await POST(makeRequest({ ...validBody, booking_date: '10-03-2026' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Błąd walidacji');
  });

  it('zwraca 400 dla zbyt krótkiej nazwy uczestnika', async () => {
    const res = await POST(makeRequest({ ...validBody, attendee_name: 'A' }));
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});

describe('GET /api/bookings', () => {
  it('zwraca listę rezerwacji dla userId', async () => {
    (db.getBookingsByUserId as jest.Mock).mockResolvedValue([mockBooking]);

    const req = new NextRequest('http://localhost/api/bookings?userId=1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].attendee_name).toBe('Jan Kowalski');
  });

  it('zwraca 400 gdy brak userId', async () => {
    const req = new NextRequest('http://localhost/api/bookings');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Brak parametru userId');
  });
});
