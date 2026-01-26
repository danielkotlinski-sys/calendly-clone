import { NextRequest, NextResponse } from 'next/server';
import { getAvailability, getMeetingSettings, isTimeSlotAvailable } from '@/lib/db';
import { generateTimeSlots, getDayOfWeek } from '@/lib/utils';

// GET /api/availability/slots?userId=123&date=2026-01-26
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'Brak wymaganych parametrów: userId i date' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);

    // Get user's availability settings
    const availability = await getAvailability(userIdNum);
    if (!availability || availability.length === 0) {
      return NextResponse.json([]);
    }

    // Get meeting duration
    const settings = await getMeetingSettings(userIdNum);
    if (!settings) {
      return NextResponse.json(
        { error: 'Użytkownik nie ma ustawionej długości spotkań' },
        { status: 400 }
      );
    }

    // Get day of week for the requested date
    const dayOfWeek = getDayOfWeek(date);

    // Find availability for this day
    const dayAvailability = availability.filter(
      (slot) => slot.day_of_week === dayOfWeek
    );

    if (dayAvailability.length === 0) {
      return NextResponse.json([]);
    }

    // Generate all possible time slots
    const allSlots: { time: string; available: boolean }[] = [];

    for (const slot of dayAvailability) {
      const timeSlots = generateTimeSlots(
        slot.start_time,
        slot.end_time,
        settings.duration
      );

      for (const time of timeSlots) {
        const available = await isTimeSlotAvailable(
          userIdNum,
          date,
          time,
          settings.duration
        );

        allSlots.push({ time, available });
      }
    }

    // Sort by time and remove duplicates
    const uniqueSlots = allSlots
      .sort((a, b) => a.time.localeCompare(b.time))
      .filter((slot, index, self) =>
        index === self.findIndex((s) => s.time === slot.time)
      );

    return NextResponse.json(uniqueSlots);
  } catch (error) {
    console.error('Error calculating slots:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas obliczania dostępnych terminów' },
      { status: 500 }
    );
  }
}
