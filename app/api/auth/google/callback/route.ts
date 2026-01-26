import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client, storeTokens } from '@/lib/google-calendar';

// GET /api/auth/google/callback?code=...&state=userId
// Handle OAuth callback from Google
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=google_auth_denied`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Brak wymaganych parametrów' },
        { status: 400 }
      );
    }

    const userId = parseInt(state);
    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in database
    await storeTokens(userId, tokens);

    // Redirect back to dashboard
    return NextResponse.redirect(
      new URL('/dashboard?success=google_connected', request.url)
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=google_auth_failed', request.url)
    );
  }
}
