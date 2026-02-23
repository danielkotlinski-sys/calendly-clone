import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createBooking,
  getBookingsByUserId,
  getUserById,
  isTimeSlotAvailable,
  getMeetingSettings,
} from '@/lib/db';
import { sendBookingEmails, sendOrganizerNotification, sendErrorAlert } from '@/lib/email';
import { createCalendarEvent, isCalendarConnected } from '@/lib/google-calendar';

// Validation schema
const createBookingSchema = z.object({
  user_id: z.number(),
  attendee_name: z.string().min(2).max(100),
  attendee_email: z.string().email('Nieprawidłowy format email'),
  attendee_phone: z.string().optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD'),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format czasu: HH:MM'),
  duration: z.number().optional(),
});

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createBookingSchema.parse(body);

    // Get user
    const user = await getUserById(validatedData.user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'Użytkownik nie został znaleziony' },
        { status: 404 }
      );
    }

    // Get meeting duration - from body or from settings (backwards compatibility)
    let duration: number;

    if (validatedData.duration) {
      duration = validatedData.duration;
    } else {
      const settings = await getMeetingSettings(validatedData.user_id);
      if (!settings) {
        return NextResponse.json(
          { error: 'Użytkownik nie ma ustawionej długości spotkań' },
          { status: 400 }
        );
      }
      duration = settings.duration;
    }

    // Check if time slot is available
    const available = await isTimeSlotAvailable(
      validatedData.user_id,
      validatedData.booking_date,
      validatedData.booking_time,
      duration
    );

    if (!available) {
      return NextResponse.json(
        { error: 'Ten termin jest już zajęty' },
        { status: 409 }
      );
    }

    // Create booking
    let booking = await createBooking(
      validatedData.user_id,
      validatedData.attendee_name,
      validatedData.attendee_email,
      validatedData.booking_date,
      validatedData.booking_time,
      duration,
      validatedData.attendee_phone
    );

    // Try to create Google Calendar event if user has connected
    const calendarConnected = await isCalendarConnected(validatedData.user_id);
    let calendarEventCreated = false;

    if (calendarConnected) {
      try {
        const calendarEvent = await createCalendarEvent(
          validatedData.user_id,
          validatedData.attendee_name,
          validatedData.attendee_email,
          validatedData.booking_date,
          validatedData.booking_time,
          duration,
          user.name,
          user.email
        );

        if (calendarEvent) {
          calendarEventCreated = true;
          booking = {
            ...booking,
            google_calendar_event_id: calendarEvent.eventId,
            google_meet_link: calendarEvent.meetLink,
          };
        } else {
          // Event creation returned null - silent failure
          console.error('Calendar event creation returned null');
          await sendErrorAlert(
            user.email,
            `Nie udało się utworzyć eventu w Google Calendar dla rezerwacji: ${validatedData.attendee_name} (${validatedData.attendee_email}), ${validatedData.booking_date} ${validatedData.booking_time}`
          );
        }
      } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        await sendErrorAlert(
          user.email,
          `Błąd tworzenia eventu w Google Calendar dla rezerwacji: ${validatedData.attendee_name} (${validatedData.attendee_email}), ${validatedData.booking_date} ${validatedData.booking_time}. Błąd: ${error}`
        );
      }
    }

    // Always notify organizer immediately via Resend
    try {
      await sendOrganizerNotification(
        user,
        validatedData.attendee_name,
        validatedData.attendee_email,
        validatedData.booking_date,
        validatedData.booking_time,
        duration
      );
    } catch (error) {
      console.error('Error sending organizer notification:', error);
    }

    // Send attendee confirmation via Resend only if Google Calendar didn't handle it
    if (!calendarEventCreated) {
      try {
        await sendBookingEmails(user, booking);
      } catch (error) {
        console.error('Error sending booking emails:', error);
        await sendErrorAlert(
          user.email,
          `Nie udało się wysłać emaila potwierdzającego do: ${validatedData.attendee_name} (${validatedData.attendee_email}), ${validatedData.booking_date} ${validatedData.booking_time}. Błąd: ${error}`
        );
      }
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Błąd walidacji', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas tworzenia rezerwacji' },
      { status: 500 }
    );
  }
}

// GET /api/bookings?userId=123 - Get bookings for user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak parametru userId' },
        { status: 400 }
      );
    }

    const bookings = await getBookingsByUserId(parseInt(userId));

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania rezerwacji' },
      { status: 500 }
    );
  }
}
