import { NextRequest, NextResponse } from 'next/server';
import { isCalendarConnected } from '@/lib/google-calendar';

// GET /api/auth/google/status?userId=123
// Check if user has connected Google Calendar
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

    const connected = await isCalendarConnected(parseInt(userId));

    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Error checking calendar status:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas sprawdzania statusu' },
      { status: 500 }
    );
  }
}
