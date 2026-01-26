#!/bin/bash

# Skrypt do resetowania bazy danych

echo "🗑️  Resetowanie bazy danych..."

# Zatrzymanie serwera jeśli działa
pkill -f "next dev" 2>/dev/null

# Usunięcie bazy danych
if [ -f "calendly.db" ]; then
  rm calendly.db
  echo "✅ Usunięto bazę danych SQLite"
else
  echo "ℹ️  Baza danych nie istnieje"
fi

# Usunięcie pliku journal
if [ -f "calendly.db-journal" ]; then
  rm calendly.db-journal
  echo "✅ Usunięto plik journal"
fi

# Usunięcie cache Next.js
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ Usunięto cache Next.js"
fi

echo ""
echo "🎉 Baza danych zresetowana!"
echo ""
echo "Aby uruchomić aplikację ze świeżą bazą:"
echo "  npm run dev"
echo ""
echo "Aby dodać dane testowe:"
echo "  ./scripts/seed-test-data.sh"
echo ""
