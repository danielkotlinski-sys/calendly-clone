-- Schemat bazy danych dla Vercel Postgres
-- Wykonaj ten skrypt w Vercel Dashboard → Storage → Database → Query

-- Tabela użytkowników
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela dostępności
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL,  -- 0=Niedziela, 1=Poniedziałek, etc.
  start_time VARCHAR(10) NOT NULL,  -- Format: "09:00"
  end_time VARCHAR(10) NOT NULL     -- Format: "17:00"
);

-- Tabela ustawień spotkań
CREATE TABLE meeting_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  duration INTEGER NOT NULL  -- 15, 30, lub 60 minut
);

-- Tabela rezerwacji
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  attendee_name VARCHAR(255) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  booking_date VARCHAR(20) NOT NULL,  -- Format: "2026-01-26"
  booking_time VARCHAR(10) NOT NULL,  -- Format: "14:00"
  duration INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeksy dla lepszej wydajności
CREATE INDEX idx_availability_user_id ON availability(user_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_meeting_settings_user_id ON meeting_settings(user_id);
