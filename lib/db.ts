import Database from 'better-sqlite3';
import { sql } from '@vercel/postgres';
import type { User, Availability, MeetingSettings, Booking } from '@/types';

const isProduction = process.env.NODE_ENV === 'production';

// SQLite database for development
let db: Database.Database | null = null;

if (!isProduction) {
  db = new Database('calendly.db');

  // Initialize tables for SQLite
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS meeting_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      duration INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      attendee_name TEXT NOT NULL,
      attendee_email TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

// User CRUD operations
export async function createUser(username: string, email: string, name: string): Promise<User> {
  if (isProduction) {
    const result = await sql`
      INSERT INTO users (username, email, name)
      VALUES (${username}, ${email}, ${name})
      RETURNING *
    `;
    return result.rows[0] as User;
  } else {
    const stmt = db!.prepare('INSERT INTO users (username, email, name) VALUES (?, ?, ?)');
    const info = stmt.run(username, email, name);
    const user = await getUserById(info.lastInsertRowid as number);
    if (!user) throw new Error('Failed to create user');
    return user;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  if (isProduction) {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result.rows[0] as User || null;
  } else {
    const stmt = db!.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User || null;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  if (isProduction) {
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    return result.rows[0] as User || null;
  } else {
    const stmt = db!.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User || null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isProduction) {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return result.rows[0] as User || null;
  } else {
    const stmt = db!.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User || null;
  }
}

// Availability CRUD operations
export async function setAvailability(
  userId: number,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<Availability> {
  if (isProduction) {
    const result = await sql`
      INSERT INTO availability (user_id, day_of_week, start_time, end_time)
      VALUES (${userId}, ${dayOfWeek}, ${startTime}, ${endTime})
      RETURNING *
    `;
    return result.rows[0] as Availability;
  } else {
    const stmt = db!.prepare(
      'INSERT INTO availability (user_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
    );
    const info = stmt.run(userId, dayOfWeek, startTime, endTime);
    return {
      id: info.lastInsertRowid as number,
      user_id: userId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    };
  }
}

export async function clearAvailability(userId: number): Promise<void> {
  if (isProduction) {
    await sql`DELETE FROM availability WHERE user_id = ${userId}`;
  } else {
    const stmt = db!.prepare('DELETE FROM availability WHERE user_id = ?');
    stmt.run(userId);
  }
}

export async function getAvailability(userId: number): Promise<Availability[]> {
  if (isProduction) {
    const result = await sql`SELECT * FROM availability WHERE user_id = ${userId}`;
    return result.rows as Availability[];
  } else {
    const stmt = db!.prepare('SELECT * FROM availability WHERE user_id = ?');
    return stmt.all(userId) as Availability[];
  }
}

// Meeting Settings operations
export async function setMeetingDuration(userId: number, duration: number): Promise<MeetingSettings> {
  if (isProduction) {
    const result = await sql`
      INSERT INTO meeting_settings (user_id, duration)
      VALUES (${userId}, ${duration})
      ON CONFLICT (user_id) DO UPDATE SET duration = ${duration}
      RETURNING *
    `;
    return result.rows[0] as MeetingSettings;
  } else {
    const stmt = db!.prepare(`
      INSERT INTO meeting_settings (user_id, duration)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET duration = excluded.duration
    `);
    stmt.run(userId, duration);
    const settings = await getMeetingSettings(userId);
    if (!settings) throw new Error('Failed to save meeting settings');
    return settings;
  }
}

export async function getMeetingSettings(userId: number): Promise<MeetingSettings | null> {
  if (isProduction) {
    const result = await sql`SELECT * FROM meeting_settings WHERE user_id = ${userId}`;
    return result.rows[0] as MeetingSettings || null;
  } else {
    const stmt = db!.prepare('SELECT * FROM meeting_settings WHERE user_id = ?');
    return stmt.get(userId) as MeetingSettings || null;
  }
}

// Bookings CRUD operations
export async function createBooking(
  userId: number,
  attendeeName: string,
  attendeeEmail: string,
  bookingDate: string,
  bookingTime: string,
  duration: number
): Promise<Booking> {
  if (isProduction) {
    const result = await sql`
      INSERT INTO bookings (user_id, attendee_name, attendee_email, booking_date, booking_time, duration)
      VALUES (${userId}, ${attendeeName}, ${attendeeEmail}, ${bookingDate}, ${bookingTime}, ${duration})
      RETURNING *
    `;
    return result.rows[0] as Booking;
  } else {
    const stmt = db!.prepare(
      'INSERT INTO bookings (user_id, attendee_name, attendee_email, booking_date, booking_time, duration) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(userId, attendeeName, attendeeEmail, bookingDate, bookingTime, duration);
    const getStmt = db!.prepare('SELECT * FROM bookings WHERE id = ?');
    return getStmt.get(info.lastInsertRowid) as Booking;
  }
}

export async function getBookingsByUserId(userId: number): Promise<Booking[]> {
  if (isProduction) {
    const result = await sql`SELECT * FROM bookings WHERE user_id = ${userId} ORDER BY booking_date, booking_time`;
    return result.rows as Booking[];
  } else {
    const stmt = db!.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date, booking_time');
    return stmt.all(userId) as Booking[];
  }
}

export async function getBookingsByDateRange(
  userId: number,
  startDate: string,
  endDate: string
): Promise<Booking[]> {
  if (isProduction) {
    const result = await sql`
      SELECT * FROM bookings
      WHERE user_id = ${userId}
      AND booking_date >= ${startDate}
      AND booking_date <= ${endDate}
      ORDER BY booking_date, booking_time
    `;
    return result.rows as Booking[];
  } else {
    const stmt = db!.prepare(
      'SELECT * FROM bookings WHERE user_id = ? AND booking_date >= ? AND booking_date <= ? ORDER BY booking_date, booking_time'
    );
    return stmt.all(userId, startDate, endDate) as Booking[];
  }
}

// Helper to check if a time slot is available
export async function isTimeSlotAvailable(
  userId: number,
  date: string,
  time: string,
  duration: number
): Promise<boolean> {
  const bookings = await getBookingsByDateRange(userId, date, date);

  // Convert time to minutes for easier comparison
  const [hours, minutes] = time.split(':').map(Number);
  const slotStart = hours * 60 + minutes;
  const slotEnd = slotStart + duration;

  for (const booking of bookings) {
    const [bHours, bMinutes] = booking.booking_time.split(':').map(Number);
    const bookingStart = bHours * 60 + bMinutes;
    const bookingEnd = bookingStart + booking.duration;

    // Check for overlap
    if (slotStart < bookingEnd && slotEnd > bookingStart) {
      return false;
    }
  }

  return true;
}

export { db };
