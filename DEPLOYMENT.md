# Instrukcja wdrożenia na Vercel

## Krok 1: Wypchaj kod do GitHub

```bash
# Jeśli nie masz jeszcze repozytorium GitHub, utwórz je na github.com
# Następnie:

git remote add origin https://github.com/twoj-username/calendly-clone.git
git push -u origin main
```

## Krok 2: Zaloguj się do Vercel

1. Przejdź na https://vercel.com
2. Zaloguj się przez GitHub
3. Kliknij "Add New..." → "Project"
4. Wybierz swoje repozytorium `calendly-clone`
5. Kliknij "Import"

## Krok 3: Konfiguracja projektu

W ustawieniach projektu przed deploymentem:

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: ./
- **Build Command**: `npm run build`
- **Output Directory**: .next

Kliknij **"Deploy"** - pierwsze wdrożenie się nie powiedzie, ponieważ brakuje bazy danych i zmiennych środowiskowych.

## Krok 4: Dodaj bazę danych Vercel Postgres

1. W projekcie Vercel przejdź do zakładki **"Storage"**
2. Kliknij **"Create Database"**
3. Wybierz **"Postgres"**
4. Wybierz region (Europe - najlepiej najbliżej użytkowników)
5. Wybierz plan **"Hobby"** (darmowy)
6. Kliknij **"Create"**

## Krok 5: Zainicjalizuj tabele w bazie danych

1. Po utworzeniu bazy, przejdź do **"Data"** → **"Query"**
2. Wykonaj poniższe SQL:

```sql
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
  day_of_week INTEGER NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL
);

-- Tabela ustawień spotkań
CREATE TABLE meeting_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  duration INTEGER NOT NULL
);

-- Tabela rezerwacji
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

3. Kliknij **"Run Query"**

## Krok 6: Ustaw zmienne środowiskowe

1. Przejdź do **"Settings"** → **"Environment Variables"**
2. Dodaj następujące zmienne:

| Klucz | Wartość | Environment |
|-------|---------|-------------|
| `EMAIL_HOST` | `smtp.gmail.com` | Production |
| `EMAIL_PORT` | `587` | Production |
| `EMAIL_USER` | `twoj-email@gmail.com` | Production |
| `EMAIL_PASSWORD` | `twoje-app-password` | Production |
| `NODE_ENV` | `production` | Production |

**Uwaga**: Zmienna `POSTGRES_URL` zostanie automatycznie dodana przez Vercel po podłączeniu bazy danych.

### Jak uzyskać Gmail App Password:

1. Przejdź do https://myaccount.google.com/security
2. Włącz **"2-Step Verification"** (weryfikacja dwuetapowa)
3. Przejdź do https://myaccount.google.com/apppasswords
4. Wybierz **"Mail"** i **"Other"** (wpisz "Vercel")
5. Kliknij **"Generate"**
6. Skopiuj wygenerowane hasło (16 znaków)
7. Wklej je do zmiennej `EMAIL_PASSWORD` w Vercel

## Krok 7: Redeploy aplikacji

1. Przejdź do zakładki **"Deployments"**
2. Znajdź ostatnie wdrożenie (failed)
3. Kliknij trzy kropki **"..."** → **"Redeploy"**
4. Poczekaj na zakończenie buildu

## Krok 8: Testowanie

1. Otwórz URL swojej aplikacji (np. `https://calendly-clone-xyz.vercel.app`)
2. Zarejestruj się jako użytkownik
3. Ustaw dostępność w Dashboard
4. Skopiuj link bookingowy
5. Otwórz link w trybie incognito
6. Zarezerwuj spotkanie
7. Sprawdź czy otrzymałeś emaile (organizator i uczestnik)

## Krok 9: Własna domena (opcjonalnie)

1. W projekcie Vercel przejdź do **"Settings"** → **"Domains"**
2. Dodaj swoją domenę
3. Skonfiguruj DNS zgodnie z instrukcjami Vercel
4. Poczekaj na propagację DNS (do 48h)

## Troubleshooting

### Build fails: "Could not connect to database"

- Sprawdź czy baza danych Vercel Postgres została utworzona
- Sprawdź czy tabele zostały zainicjalizowane
- Sprawdź czy zmienna `POSTGRES_URL` jest ustawiona (powinna być automatyczna)

### Emaile się nie wysyłają

- Sprawdź czy `EMAIL_USER` i `EMAIL_PASSWORD` są poprawne
- Sprawdź czy Gmail App Password jest aktywne
- Sprawdź logi w Vercel: Deployments → kliknij deployment → Functions → kliknij funkcję → Logs

### "User not found" po rejestracji

- Sprawdź czy tabele w bazie danych zostały utworzone
- Sprawdź logi funkcji `/api/users` w Vercel

### Przekroczony limit darmowego tieru

Vercel Hobby (Free):
- 100 GB bandwidth/miesiąc
- Unlimited requests
- 10 deploys/day

Vercel Postgres (Free):
- 256 MB storage
- 60 godzin compute/miesiąc

Jeśli przekroczysz limity, rozważ upgrade lub migrację do innego hostingu.

## Następne kroki

Po udanym wdrożeniu:

1. **Monitoring**: Skonfiguruj alerty w Vercel dla błędów
2. **Analytics**: Dodaj Vercel Analytics dla statystyk
3. **SEO**: Dodaj metadata i Open Graph tags
4. **Bezpieczeństwo**: Dodaj rate limiting dla API
5. **Backup**: Skonfiguruj backupy bazy danych

## Wsparcie

W razie problemów:
- Sprawdź logi w Vercel Dashboard
- Przejrzyj dokumentację Vercel: https://vercel.com/docs
- GitHub Issues: https://github.com/vercel/next.js/issues

## Gratulacje!

Twoja aplikacja rezerwacji spotkań jest już dostępna online! 🎉
