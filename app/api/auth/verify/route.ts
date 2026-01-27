import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/verify
// Simple password verification for dashboard access
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Check against environment variable
    const correctPassword = process.env.DASHBOARD_PASSWORD || 'admin123';

    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd' },
      { status: 500 }
    );
  }
}
