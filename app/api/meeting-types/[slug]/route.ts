import { NextRequest, NextResponse } from 'next/server';
import { getMeetingTypeBySlug } from '@/lib/db';

// GET /api/meeting-types/[slug]?userId=123
// Get meeting type by slug for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak parametru userId' },
        { status: 400 }
      );
    }

    const meetingType = await getMeetingTypeBySlug(parseInt(userId), slug);

    if (!meetingType) {
      return NextResponse.json(
        { error: 'Typ spotkania nie został znaleziony' },
        { status: 404 }
      );
    }

    return NextResponse.json(meetingType);
  } catch (error) {
    console.error('Error fetching meeting type:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania typu spotkania' },
      { status: 500 }
    );
  }
}
