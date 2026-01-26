import { NextRequest, NextResponse } from 'next/server';
import { getAvailability, getMeetingSettings, isTimeSlotAvailable } from '@/lib/db';
import { generateTimeSlots, getDayOfWeek } from '@/lib/utils';
import { getBusyTimes, isCalendarConnected } from '@/lib/google-calendar';

// GET /api/availability/slots?userId=123&date=2026-01-26&duration=30
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const durationParam = searchParams.get('duration');

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

    // Get meeting duration - from param or from settings (backwards compatibility)
    let duration: number;
    let minimumNotice: number = 0;

    if (durationParam) {
      duration = parseInt(durationParam);
      // Still get settings for minimum_notice
      const settings = await getMeetingSettings(userIdNum);
      if (settings) {
        minimumNotice = settings.minimum_notice || 0;
      }
    } else {
      const settings = await getMeetingSettings(userIdNum);
      if (!settings) {
        return NextResponse.json(
          { error: 'Użytkownik nie ma ustawionej długości spotkań' },
          { status: 400 }
        );
      }
      duration = settings.duration;
      minimumNotice = settings.minimum_notice || 0;
    }

    // Get day of week for the requested date
    const dayOfWeek = getDayOfWeek(date);

    // Find availability for this day (either weekday-based or date range-based)
    const dayAvailability = availability.filter((slot) => {
      // Weekday-based availability
      if (slot.day_of_week !== null && slot.day_of_week !== undefined) {
        return slot.day_of_week === dayOfWeek;
      }

      // Date range-based availability
      if (slot.start_date && slot.end_date) {
        return date >= slot.start_date && date <= slot.end_date;
      }

      return false;
    });

    if (dayAvailability.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate minimum booking time based on minimum_notice
    const now = new Date();
    const minimumNoticeMs = minimumNotice * 60 * 60 * 1000;
    const minimumBookingTime = new Date(now.getTime() + minimumNoticeMs);

    // Get busy times from Google Calendar if connected
    let googleCalendarBusy: Array<{ start: string; end: string }> = [];
    const calendarConnected = await isCalendarConnected(userIdNum);
    if (calendarConnected) {
      try {
        googleCalendarBusy = await getBusyTimes(userIdNum, date, date);
      } catch (error) {
        console.error('Error fetching Google Calendar busy times:', error);
        // Continue without Calendar check
      }
    }

    // Generate all possible time slots
    const allSlots: { time: string; available: boolean }[] = [];

    for (const slot of dayAvailability) {
      const timeSlots = generateTimeSlots(
        slot.start_time,
        slot.end_time,
        duration
      );

      for (const time of timeSlots) {
        // Check if slot meets minimum notice requirement
        // IMPORTANT: Add timezone info to match Google Calendar format
        const slotDateTime = new Date(`${date}T${time}:00+01:00`); // Europe/Warsaw
        if (slotDateTime < minimumBookingTime) {
          continue; // Skip slots that are too soon
        }

        // Check if slot is available in our database
        let available = await isTimeSlotAvailable(
          userIdNum,
          date,
          time,
          duration
        );

        // Also check against Google Calendar busy times
        if (available && googleCalendarBusy.length > 0) {
          const slotStart = slotDateTime.getTime();
          const slotEnd = slotStart + duration * 60 * 1000;

          for (const busy of googleCalendarBusy) {
            const busyStart = new Date(busy.start).getTime();
            const busyEnd = new Date(busy.end).getTime();

            // Debug logging
            if (process.env.NODE_ENV === 'production') {
              console.log(`Checking slot ${time}: ${slotStart} - ${slotEnd}`);
              console.log(`Against busy: ${busyStart} - ${busyEnd}`);
              console.log(`Overlap? ${slotStart < busyEnd && slotEnd > busyStart}`);
            }

            // Check for overlap
            if (slotStart < busyEnd && slotEnd > busyStart) {
              available = false;
              console.log(`❌ Slot ${time} blocked by Google Calendar event`);
              break;
            }
          }
        }

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
