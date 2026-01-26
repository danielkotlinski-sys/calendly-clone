import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';

// GET /api/auth/google?userId=123
// Redirect user to Google OAuth consent screen
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

    const authUrl = getAuthUrl(parseInt(userId));
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas autoryzacji' },
      { status: 500 }
    );
  }
}
