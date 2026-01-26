import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setAvailability, clearAvailability, getAvailability } from '@/lib/db';

// Validation schema
const availabilitySchema = z.object({
  user_id: z.number(),
  availability: z.array(
    z.object({
      day_of_week: z.number().min(0).max(6).optional(),
      start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format czasu: HH:MM'),
      end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format czasu: HH:MM'),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    })
  ),
});

// POST /api/availability - Set user availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = availabilitySchema.parse(body);

    // Clear existing availability
    await clearAvailability(validatedData.user_id);

    // Set new availability
    const results = [];
    for (const slot of validatedData.availability) {
      const result = await setAvailability(
        validatedData.user_id,
        slot.day_of_week ?? null,
        slot.start_time,
        slot.end_time,
        slot.start_date,
        slot.end_date
      );
      results.push(result);
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Błąd walidacji', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error setting availability:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas zapisywania dostępności' },
      { status: 500 }
    );
  }
}

// GET /api/availability?userId=123 - Get user availability
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

    const availability = await getAvailability(parseInt(userId));

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania dostępności' },
      { status: 500 }
    );
  }
}
