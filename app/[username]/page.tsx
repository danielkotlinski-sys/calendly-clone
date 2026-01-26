'use client';

import { use, useEffect, useState } from 'react';
import type { User } from '@/types';
import { formatDate, formatDateDisplay } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  hasSlots: boolean;
}

export default function BookingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [monthAvailability, setMonthAvailability] = useState<Map<string, boolean>>(new Map());

  // Form state
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
  }, [username]);

  useEffect(() => {
    if (user) {
      loadMonthAvailability();
    }
  }, [user, currentMonth]);

  useEffect(() => {
    if (selectedDate && user) {
      loadSlots();
    }
  }, [selectedDate, user]);

  const loadUser = async () => {
    try {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) {
        setError('Użytkownik nie został znaleziony');
        setLoading(false);
        return;
      }
      const userData = await res.json();
      setUser(userData);
      setLoading(false);
    } catch (err) {
      setError('Wystąpił błąd podczas ładowania danych');
      setLoading(false);
    }
  };

  const loadMonthAvailability = async () => {
    if (!user) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const availabilityMap = new Map<string, boolean>();

    // Check availability for each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);

      try {
        const res = await fetch(`/api/availability/slots?userId=${user.id}&date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          const hasAvailableSlots = data.some((slot: TimeSlot) => slot.available);
          availabilityMap.set(dateStr, hasAvailableSlots);
        }
      } catch (err) {
        console.error('Error loading availability for', dateStr, err);
      }
    }

    setMonthAvailability(availabilityMap);
  };

  const loadSlots = async () => {
    if (!user || !selectedDate) return;

    try {
      const res = await fetch(`/api/availability/slots?userId=${user.id}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowForm(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          attendee_phone: attendeePhone || undefined,
          booking_date: selectedDate,
          booking_time: selectedTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Wystąpił błąd podczas rezerwacji');
        setSubmitting(false);
        return;
      }

      setBookingSuccess(true);
    } catch (err) {
      setError('Wystąpił błąd połączenia. Spróbuj ponownie.');
      setSubmitting(false);
    }
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const calendar: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }

    return calendar;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate('');
    setSelectedTime('');
    setShowForm(false);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate('');
    setSelectedTime('');
    setShowForm(false);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    const hasAvailability = monthAvailability.get(dateStr);

    if (hasAvailability) {
      setSelectedDate(dateStr);
      setSelectedTime('');
      setShowForm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Błąd</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Rezerwacja potwierdzona!
          </h1>
          <p className="text-gray-600 mb-6">
            Spotkanie zostało zarezerwowane. Potwierdzenie zostało wysłane na adres <strong>{attendeeEmail}</strong>.
          </p>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2">
              <strong className="text-indigo-700">Z kim:</strong> {user?.name}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong className="text-indigo-700">Data:</strong> {formatDateDisplay(selectedDate)}
            </p>
            <p className="text-sm text-gray-700 mb-4">
              <strong className="text-indigo-700">Godzina:</strong> {selectedTime}
            </p>
            <div className="pt-4 border-t border-indigo-200">
              <div className="flex items-center text-emerald-700">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-semibold">Spotkanie odbędzie się przez Google Meet</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Zarezerwuj kolejne spotkanie
          </button>
        </div>
      </div>
    );
  }

  const calendar = generateCalendar();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {user?.name}
            </h1>
            <p className="text-gray-600 mt-3 text-lg">Wybierz termin spotkania</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Interactive Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <h2 className="text-2xl font-bold text-gray-900">
                  {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                </h2>

                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendar.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateStr = formatDate(date);
                  const hasAvailability = monthAvailability.get(dateStr);
                  const isSelected = dateStr === selectedDate;
                  const isPast = date < today;
                  const isToday = date.toDateString() === today.toDateString();

                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && handleDateClick(date)}
                      disabled={isPast || !hasAvailability}
                      className={`aspect-square rounded-xl font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg scale-105'
                          : hasAvailability && !isPast
                          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:shadow-md'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      } ${isToday && !isSelected ? 'ring-2 ring-indigo-400' : ''}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-100"></div>
                  <span className="text-gray-600">Dostępne</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100"></div>
                  <span className="text-gray-600">Niedostępne</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-600"></div>
                  <span className="text-gray-600">Wybrana data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Slots / Booking Form */}
          <div className="lg:col-span-1">
            {!selectedDate ? (
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Wybierz datę</h3>
                <p className="text-gray-600 text-sm">Wybierz dostępny dzień z kalendarza, aby zobaczyć wolne terminy</p>
              </div>
            ) : !showForm ? (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {formatDateDisplay(selectedDate)}
                </h3>

                {slots.length === 0 || !slots.some(s => s.available) ? (
                  <p className="text-gray-500 text-center py-8 text-sm">
                    Brak dostępnych terminów w wybranym dniu
                  </p>
                ) : (
                  <div className="space-y-2">
                    {slots
                      .filter((slot) => slot.available)
                      .map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className="w-full px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 hover:shadow-md transition-all font-medium"
                        >
                          {slot.time}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTime('');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 mb-4 flex items-center font-medium"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Zmień termin
                </button>

                <h3 className="text-lg font-bold text-gray-900 mb-4">Potwierdź rezerwację</h3>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Data:</strong> {formatDateDisplay(selectedDate)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Godzina:</strong> {selectedTime}
                  </p>
                </div>

                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Imię i nazwisko *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Jan Kowalski"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="jan@example.com"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Numer telefonu
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="+48 123 456 789"
                      value={attendeePhone}
                      onChange={(e) => setAttendeePhone(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? 'Rezerwuję...' : 'Potwierdź rezerwację'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
