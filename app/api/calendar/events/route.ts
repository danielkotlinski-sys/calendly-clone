import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingEvents } from '@/lib/google-calendar';

// GET /api/calendar/events?userId=123
// Get upcoming events from Google Calendar
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

    const events = await getUpcomingEvents(parseInt(userId), 10);

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania wydarzeń' },
      { status: 500 }
    );
  }
}
