import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser, getUserByUsername, getUserByEmail } from '@/lib/db';

// Validation schema
const createUserSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, 'Username może zawierać tylko małe litery, cyfry i myślniki'),
  email: z.string().email('Nieprawidłowy format email'),
  name: z.string().min(2).max(100),
});

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createUserSchema.parse(body);

    // Check if username already exists
    const existingUsername = await getUserByUsername(validatedData.username);
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Nazwa użytkownika jest już zajęta' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await getUserByEmail(validatedData.email);
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email jest już zarejestrowany' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(
      validatedData.username,
      validatedData.email,
      validatedData.name
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Błąd walidacji', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas tworzenia użytkownika' },
      { status: 500 }
    );
  }
}
