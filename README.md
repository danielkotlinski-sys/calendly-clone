# Calendly Clone - Aplikacja do rezerwacji spotkań

Pełna aplikacja do rezerwacji spotkań online, zbudowana z Next.js, TypeScript, Tailwind CSS i SQLite/PostgreSQL.

## Funkcje

- 📅 **Landing Page** z rejestracją użytkownika
- ⚙️ **Panel użytkownika** z ustawieniami dostępności
- 🔗 **Unikalny link bookingowy** dla każdego użytkownika
- 📆 **Publiczny kalendarz** z dostępnymi terminami
- ✉️ **Powiadomienia email** (Gmail SMTP)
- 🗄️ **Baza danych** SQLite (dev) / Vercel Postgres (prod)

## Instalacja i uruchomienie

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Konfiguracja zmiennych środowiskowych

Edytuj plik `.env.local`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=twoj-email@gmail.com
EMAIL_PASSWORD=twoje-app-password
NODE_ENV=development
```

**Jak uzyskać Gmail App Password:**
1. Przejdź do https://myaccount.google.com/security
2. Włącz weryfikację dwuetapową
3. Wygeneruj hasło aplikacji: https://myaccount.google.com/apppasswords
4. Skopiuj wygenerowane hasło do `.env.local`

### 3. Uruchom aplikację

```bash
npm run dev
```

Aplikacja będzie dostępna pod: **http://localhost:3000**

## Jak używać

### Dla organizatora spotkań:

1. Otwórz http://localhost:3000
2. Zarejestruj się (imię, email, username)
3. W Dashboardzie:
   - Wybierz dni i godziny dostępności
   - Ustaw długość spotkań (15/30/60 min)
   - Skopiuj swój link bookingowy

### Dla klientów:

1. Otwórz link bookingowy (np. http://localhost:3000/jan-kowalski)
2. Wybierz datę i dostępną godzinę
3. Podaj swoje dane (imię i email)
4. Potwierdź rezerwację

Oboje otrzymacie email z potwierdzeniem!

## Wdrożenie na Vercel

### 1. Przygotuj repozytorium

```bash
git init
git add .
git commit -m "Initial commit"
git push
```

### 2. Utwórz projekt w Vercel

- Przejdź do https://vercel.com
- Połącz swoje repozytorium GitHub
- Deploy nastąpi automatycznie

### 3. Dodaj bazę danych Vercel Postgres

- W projekcie Vercel → Storage → Create Database → Postgres
- Wykonaj SQL z sekcji poniżej

### 4. Zainicjalizuj tabele

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL
);

CREATE TABLE meeting_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  duration INTEGER NOT NULL
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  attendee_name VARCHAR(255) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  booking_date VARCHAR(20) NOT NULL,
  booking_time VARCHAR(10) NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Ustaw zmienne środowiskowe

W Vercel → Settings → Environment Variables:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=twoj-email@gmail.com
EMAIL_PASSWORD=twoje-app-password
NODE_ENV=production
```

### 6. Redeploy

Po ustawieniu zmiennych, zrób redeploy projektu.

## Stack technologiczny

- **Framework**: Next.js 14+ (App Router)
- **Język**: TypeScript
- **Styling**: Tailwind CSS
- **Baza danych**: SQLite (dev) + Vercel Postgres (prod)
- **Email**: Nodemailer + Gmail SMTP
- **Walidacja**: Zod

## Struktura projektu

```
app/
├── page.tsx              # Landing page
├── dashboard/page.tsx    # Panel użytkownika
├── [username]/page.tsx   # Publiczny booking
└── api/                  # API endpoints

lib/
├── db.ts                 # Warstwa bazy danych
├── email.ts              # System powiadomień
└── utils.ts              # Funkcje pomocnicze
```

## Licencja

MIT
