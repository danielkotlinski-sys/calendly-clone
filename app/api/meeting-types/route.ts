import { NextRequest, NextResponse } from 'next/server';
import {
  createMeetingType,
  getMeetingTypesByUserId,
  updateMeetingType,
  deleteMeetingType,
} from '@/lib/db';

// GET /api/meeting-types?userId=123
// Get all meeting types for a user
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

    const meetingTypes = await getMeetingTypesByUserId(parseInt(userId));
    return NextResponse.json(meetingTypes);
  } catch (error) {
    console.error('Error fetching meeting types:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania typów spotkań' },
      { status: 500 }
    );
  }
}

// POST /api/meeting-types
// Create a new meeting type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, slug, duration, isDefault } = body;

    if (!userId || !name || !slug || !duration) {
      return NextResponse.json(
        { error: 'Brak wymaganych pól' },
        { status: 400 }
      );
    }

    const meetingType = await createMeetingType(
      parseInt(userId),
      name,
      slug,
      parseInt(duration),
      isDefault || false
    );

    return NextResponse.json(meetingType);
  } catch (error) {
    console.error('Error creating meeting type:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas tworzenia typu spotkania' },
      { status: 500 }
    );
  }
}

// PUT /api/meeting-types
// Update a meeting type
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, slug, duration, isDefault } = body;

    if (!id || !name || !slug || !duration) {
      return NextResponse.json(
        { error: 'Brak wymaganych pól' },
        { status: 400 }
      );
    }

    const meetingType = await updateMeetingType(
      parseInt(id),
      name,
      slug,
      parseInt(duration),
      isDefault || false
    );

    return NextResponse.json(meetingType);
  } catch (error) {
    console.error('Error updating meeting type:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas aktualizacji typu spotkania' },
      { status: 500 }
    );
  }
}

// DELETE /api/meeting-types?id=123
// Delete a meeting type
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Brak parametru id' },
        { status: 400 }
      );
    }

    await deleteMeetingType(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting type:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas usuwania typu spotkania' },
      { status: 500 }
    );
  }
}
