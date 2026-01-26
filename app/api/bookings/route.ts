import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createBooking,
  getBookingsByUserId,
  getUserById,
  isTimeSlotAvailable,
  getMeetingSettings,
} from '@/lib/db';
import { sendBookingEmails } from '@/lib/email';

// Validation schema
const createBookingSchema = z.object({
  user_id: z.number(),
  attendee_name: z.string().min(2).max(100),
  attendee_email: z.string().email('Nieprawidłowy format email'),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD'),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format czasu: HH:MM'),
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

    // Get meeting duration
    const settings = await getMeetingSettings(validatedData.user_id);
    if (!settings) {
      return NextResponse.json(
        { error: 'Użytkownik nie ma ustawionej długości spotkań' },
        { status: 400 }
      );
    }

    // Check if time slot is available
    const available = await isTimeSlotAvailable(
      validatedData.user_id,
      validatedData.booking_date,
      validatedData.booking_time,
      settings.duration
    );

    if (!available) {
      return NextResponse.json(
        { error: 'Ten termin jest już zajęty' },
        { status: 409 }
      );
    }

    // Create booking
    const booking = await createBooking(
      validatedData.user_id,
      validatedData.attendee_name,
      validatedData.attendee_email,
      validatedData.booking_date,
      validatedData.booking_time,
      settings.duration
    );

    // Send confirmation emails (don't wait for it to complete)
    sendBookingEmails(user, booking).catch((error) => {
      console.error('Error sending booking emails:', error);
    });

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
