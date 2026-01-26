import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getUserById } from '@/lib/db';

// GET /api/users/[username] - Get user by username OR ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Check if parameter is numeric (ID) or string (username)
    const isNumeric = /^\d+$/.test(username);

    let user;
    if (isNumeric) {
      // Fetch by ID
      user = await getUserById(parseInt(username));
    } else {
      // Fetch by username
      user = await getUserByUsername(username);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Użytkownik nie został znaleziony' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania użytkownika' },
      { status: 500 }
    );
  }
}
