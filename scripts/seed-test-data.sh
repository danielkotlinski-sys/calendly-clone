#!/bin/bash

# Skrypt do dodawania danych testowych do aplikacji Calendly Clone

echo "🌱 Dodawanie danych testowych do bazy..."

# Kolory dla outputu
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Utworzenie użytkownika testowego
echo -e "${BLUE}📝 Tworzenie użytkownika testowego...${NC}"
USER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anna Kowalska",
    "email": "anna.kowalska@example.com",
    "username": "anna-kowalska"
  }')

USER_ID=$(echo $USER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$USER_ID" ]; then
  echo "❌ Błąd: Nie udało się utworzyć użytkownika"
  echo "Odpowiedź API: $USER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Utworzono użytkownika: Anna Kowalska (ID: $USER_ID)${NC}"

# 2. Ustawienie długości spotkań
echo -e "${BLUE}⏱️  Ustawianie długości spotkań (30 min)...${NC}"
curl -s -X POST http://localhost:3000/api/meeting-settings \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $USER_ID,
    \"duration\": 30
  }" > /dev/null

echo -e "${GREEN}✅ Długość spotkań ustawiona na 30 minut${NC}"

# 3. Ustawienie dostępności (Pon-Pt, 9:00-17:00)
echo -e "${BLUE}📅 Ustawianie dostępności (Pon-Pt, 9:00-17:00)...${NC}"
curl -s -X POST http://localhost:3000/api/availability \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $USER_ID,
    \"availability\": [
      {\"day_of_week\": 1, \"start_time\": \"09:00\", \"end_time\": \"17:00\"},
      {\"day_of_week\": 2, \"start_time\": \"09:00\", \"end_time\": \"17:00\"},
      {\"day_of_week\": 3, \"start_time\": \"09:00\", \"end_time\": \"17:00\"},
      {\"day_of_week\": 4, \"start_time\": \"09:00\", \"end_time\": \"17:00\"},
      {\"day_of_week\": 5, \"start_time\": \"09:00\", \"end_time\": \"17:00\"}
    ]
  }" > /dev/null

echo -e "${GREEN}✅ Dostępność ustawiona: Poniedziałek-Piątek, 9:00-17:00${NC}"

# 4. Utworzenie przykładowych rezerwacji
echo -e "${BLUE}📝 Tworzenie przykładowych rezerwacji...${NC}"

# Rezerwacja 1
curl -s -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $USER_ID,
    \"attendee_name\": \"Jan Nowak\",
    \"attendee_email\": \"jan.nowak@example.com\",
    \"booking_date\": \"2026-01-27\",
    \"booking_time\": \"10:00\"
  }" > /dev/null

echo -e "${GREEN}  ✅ Rezerwacja 1: Jan Nowak - 27.01.2026 10:00${NC}"

# Rezerwacja 2
curl -s -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $USER_ID,
    \"attendee_name\": \"Maria Wiśniewska\",
    \"attendee_email\": \"maria.wisniewska@example.com\",
    \"booking_date\": \"2026-01-27\",
    \"booking_time\": \"14:00\"
  }" > /dev/null

echo -e "${GREEN}  ✅ Rezerwacja 2: Maria Wiśniewska - 27.01.2026 14:00${NC}"

# Rezerwacja 3
curl -s -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": $USER_ID,
    \"attendee_name\": \"Piotr Kowalski\",
    \"attendee_email\": \"piotr.kowalski@example.com\",
    \"booking_date\": \"2026-01-28\",
    \"booking_time\": \"11:30\"
  }" > /dev/null

echo -e "${GREEN}  ✅ Rezerwacja 3: Piotr Kowalski - 28.01.2026 11:30${NC}"

echo ""
echo -e "${GREEN}🎉 Dane testowe dodane pomyślnie!${NC}"
echo ""
echo "📊 Podsumowanie:"
echo "  • Użytkownik: Anna Kowalska (anna-kowalska)"
echo "  • Email: anna.kowalska@example.com"
echo "  • Dostępność: Pon-Pt, 9:00-17:00"
echo "  • Długość spotkań: 30 min"
echo "  • Rezerwacje: 3"
echo ""
echo "🔗 Linki:"
echo "  • Dashboard: http://localhost:3000/dashboard"
echo "  • Booking: http://localhost:3000/anna-kowalska"
echo ""
