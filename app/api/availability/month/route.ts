import { NextRequest, NextResponse } from 'next/server';
import { getAvailability, getMeetingSettings, isTimeSlotAvailable } from '@/lib/db';
import { generateTimeSlots, getDayOfWeek, formatDate } from '@/lib/utils';

// GET /api/availability/month?userId=123&year=2026&month=1&duration=30
// Returns availability for entire month in single request
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const durationParam = searchParams.get('duration');

    if (!userId || !year || !month) {
      return NextResponse.json(
        { error: 'Brak wymaganych parametrów: userId, year, month' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month); // 0-based (0 = January)

    // Get user's availability settings
    const availability = await getAvailability(userIdNum);
    if (!availability || availability.length === 0) {
      return NextResponse.json({});
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

    // Calculate minimum booking time based on minimum_notice
    const now = new Date();
    const minimumNoticeMs = minimumNotice * 60 * 60 * 1000;
    const minimumBookingTime = new Date(now.getTime() + minimumNoticeMs);

    // Calculate days in month
    const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();

    // Result object: { "2026-01-15": true, "2026-01-16": false, ... }
    const monthAvailability: { [date: string]: boolean } = {};

    // Check each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum, day);
      const dateStr = formatDate(date);
      const dayOfWeek = getDayOfWeek(dateStr);

      // Find availability for this day (either weekday-based or date range-based)
      const dayAvailability = availability.filter((slot) => {
        // Weekday-based availability
        if (slot.day_of_week !== null && slot.day_of_week !== undefined) {
          return slot.day_of_week === dayOfWeek;
        }

        // Date range-based availability
        if (slot.start_date && slot.end_date) {
          return dateStr >= slot.start_date && dateStr <= slot.end_date;
        }

        return false;
      });

      if (dayAvailability.length === 0) {
        monthAvailability[dateStr] = false;
        continue;
      }

      // Generate all possible time slots for this day
      let hasAvailableSlot = false;

      for (const slot of dayAvailability) {
        const timeSlots = generateTimeSlots(
          slot.start_time,
          slot.end_time,
          duration
        );

        for (const time of timeSlots) {
          // Check if slot meets minimum notice requirement
          const slotDateTime = new Date(`${dateStr}T${time}`);
          if (slotDateTime < minimumBookingTime) {
            continue; // Skip slots that are too soon
          }

          // Check if time slot is available (not booked)
          const available = await isTimeSlotAvailable(
            userIdNum,
            dateStr,
            time,
            duration
          );

          if (available) {
            hasAvailableSlot = true;
            break;
          }
        }

        if (hasAvailableSlot) break;
      }

      monthAvailability[dateStr] = hasAvailableSlot;
    }

    return NextResponse.json(monthAvailability);
  } catch (error) {
    console.error('Error calculating month availability:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas obliczania dostępności' },
      { status: 500 }
    );
  }
}
