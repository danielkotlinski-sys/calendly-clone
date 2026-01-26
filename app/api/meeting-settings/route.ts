import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setMeetingDuration, getMeetingSettings } from '@/lib/db';

// Validation schema
const meetingSettingsSchema = z.object({
  user_id: z.number(),
  duration: z.number().min(15).max(480).multipleOf(15),
  minimum_notice: z.number().min(0).optional(),
});

// POST /api/meeting-settings - Set meeting duration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = meetingSettingsSchema.parse(body);

    // Set meeting duration
    const settings = await setMeetingDuration(
      validatedData.user_id,
      validatedData.duration,
      validatedData.minimum_notice || 0
    );

    return NextResponse.json(settings, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Błąd walidacji', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error setting meeting duration:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas zapisywania ustawień spotkania' },
      { status: 500 }
    );
  }
}

// GET /api/meeting-settings?userId=123 - Get meeting settings
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

    const settings = await getMeetingSettings(parseInt(userId));

    if (!settings) {
      return NextResponse.json(
        { error: 'Nie znaleziono ustawień dla tego użytkownika' },
        { status: 404 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching meeting settings:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania ustawień spotkania' },
      { status: 500 }
    );
  }
}
