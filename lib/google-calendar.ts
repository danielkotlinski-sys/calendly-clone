// Google Calendar API integration
import { google } from 'googleapis';
import { sql } from '@vercel/postgres';

const isProduction = process.env.NODE_ENV === 'production';

// Initialize OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );
}

// Get authorization URL for user to grant access
export function getAuthUrl(userId: number) {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: userId.toString(), // Pass userId to callback
  });
}

// Store tokens in database
export async function storeTokens(userId: number, tokens: any) {
  if (isProduction) {
    await sql`
      INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, expiry_date)
      VALUES (${userId}, ${tokens.access_token}, ${tokens.refresh_token || ''}, ${tokens.expiry_date || 0})
      ON CONFLICT (user_id) DO UPDATE SET
        access_token = ${tokens.access_token},
        refresh_token = COALESCE(${tokens.refresh_token}, google_calendar_tokens.refresh_token),
        expiry_date = ${tokens.expiry_date || 0}
    `;
  } else {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database('calendly.db');
    const stmt = db.prepare(`
      INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, expiry_date)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, refresh_token),
        expiry_date = excluded.expiry_date
    `);
    stmt.run(userId, tokens.access_token, tokens.refresh_token || '', tokens.expiry_date || 0);
    db.close();
  }
}

// Get tokens from database
export async function getTokens(userId: number) {
  if (isProduction) {
    const result = await sql`
      SELECT * FROM google_calendar_tokens WHERE user_id = ${userId}
    `;
    return result.rows[0] || null;
  } else {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database('calendly.db');
    const stmt = db.prepare('SELECT * FROM google_calendar_tokens WHERE user_id = ?');
    const tokens = stmt.get(userId);
    db.close();
    return tokens || null;
  }
}

// Get authenticated calendar client
export async function getCalendarClient(userId: number) {
  const tokens = await getTokens(userId);
  if (!tokens) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Refresh token if expired
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await storeTokens(userId, credentials);
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Check if user has connected Google Calendar
export async function isCalendarConnected(userId: number): Promise<boolean> {
  const tokens = await getTokens(userId);
  return !!tokens;
}

// Get busy times from Google Calendar
export async function getBusyTimes(
  userId: number,
  startDate: string,
  endDate: string
): Promise<Array<{ start: string; end: string }>> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return [];

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: `${startDate}T00:00:00Z`,
        timeMax: `${endDate}T23:59:59Z`,
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = response.data.calendars?.primary?.busy || [];
    return busySlots.map((slot: any) => ({
      start: slot.start,
      end: slot.end,
    }));
  } catch (error) {
    console.error('Error fetching busy times:', error);
    return [];
  }
}

// Create calendar event with Google Meet link
export async function createCalendarEvent(
  userId: number,
  attendeeName: string,
  attendeeEmail: string,
  bookingDate: string,
  bookingTime: string,
  duration: number,
  organizerName: string,
  organizerEmail: string
): Promise<{ eventId: string; meetLink: string } | null> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return null;

  try {
    // Parse date and time
    const [hours, minutes] = bookingTime.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Create event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Spotkanie: ${organizerName} & ${attendeeName}`,
        description: `Spotkanie zarezerwowane przez ${attendeeName} (${attendeeEmail})`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Europe/Warsaw',
        },
        attendees: [
          { email: attendeeEmail, displayName: attendeeName },
          { email: organizerEmail, displayName: organizerName },
        ],
        conferenceData: {
          createRequest: {
            requestId: `booking-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      },
    });

    const event = response.data;
    const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || '';

    return {
      eventId: event.id || '',
      meetLink,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}
