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

// Delete tokens from database
export async function deleteTokens(userId: number): Promise<void> {
  if (isProduction) {
    await sql`DELETE FROM google_calendar_tokens WHERE user_id = ${userId}`;
  } else {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database('calendly.db');
    db.prepare('DELETE FROM google_calendar_tokens WHERE user_id = ?').run(userId);
    db.close();
  }
}

// Get tokens from database
export async function getTokens(userId: number): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
} | null> {
  if (isProduction) {
    const result = await sql`
      SELECT * FROM google_calendar_tokens WHERE user_id = ${userId}
    `;
    return result.rows[0] as any || null;
  } else {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database('calendly.db');
    const stmt = db.prepare('SELECT * FROM google_calendar_tokens WHERE user_id = ?');
    const tokens = stmt.get(userId) as any;
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

  // Refresh token if expired or expiring within 5 minutes
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 5 * 60 * 1000) {
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

// Get upcoming events from Google Calendar
export async function getUpcomingEvents(userId: number, maxResults: number = 10) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return [];

  try {
    const now = new Date().toISOString();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    return events.map((event: any) => ({
      id: event.id,
      summary: event.summary || 'Bez tytułu',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
      htmlLink: event.htmlLink,
    }));
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
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
    // First, get list of all user's calendars
    const calendarList = await calendar.calendarList.list();
    const calendarIds = calendarList.data.items?.map(cal => ({ id: cal.id })) || [{ id: 'primary' }];

    console.log(`Checking busy times for ${calendarIds.length} calendars`);

    // Query freebusy for ALL calendars
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: `${startDate}T00:00:00+01:00`, // Europe/Warsaw timezone
        timeMax: `${endDate}T23:59:59+01:00`,
        timeZone: 'Europe/Warsaw',
        items: calendarIds,
      },
    });

    // Collect busy slots from all calendars
    const allBusySlots: Array<{ start: string; end: string }> = [];

    if (response.data.calendars) {
      for (const [calendarId, calendarData] of Object.entries(response.data.calendars)) {
        const busySlots = (calendarData as any).busy || [];
        console.log(`Calendar ${calendarId}: ${busySlots.length} busy slots`);
        allBusySlots.push(...busySlots.map((slot: any) => ({
          start: slot.start,
          end: slot.end,
        })));
      }
    }

    console.log(`Total busy slots found: ${allBusySlots.length}`);
    return allBusySlots;
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
    // Let Google Calendar API handle timezone by using timeZone field instead of offset
    const [hours, minutes] = bookingTime.split(':').map(Number);

    // Calculate end time
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    // Format WITHOUT timezone offset - let Google handle it via timeZone field
    const startDateTimeString = `${bookingDate}T${bookingTime}:00`;
    const endDateTimeString = `${bookingDate}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

    console.log(`Creating event: ${startDateTimeString} to ${endDateTimeString} (Europe/Warsaw)`);

    // Create event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: `Spotkanie: ${organizerName} & ${attendeeName}`,
        description: `Spotkanie zarezerwowane przez ${attendeeName} (${attendeeEmail})`,
        start: {
          dateTime: startDateTimeString,
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: endDateTimeString,
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
