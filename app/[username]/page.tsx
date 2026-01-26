'use client';

import { use, useEffect, useState } from 'react';
import type { User } from '@/types';
import { formatDate, getNextDays, formatDateDisplay } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Form state
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Generate next 14 days
  const dates = getNextDays(14);

  useEffect(() => {
    loadUser();
  }, [username]);

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

      // Auto-select first date
      if (dates.length > 0) {
        setSelectedDate(formatDate(dates[0]));
      }
    } catch (err) {
      setError('Wystąpił błąd podczas ładowania danych');
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Błąd</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Rezerwacja potwierdzona!</h1>
          <p className="text-gray-600 mb-6">
            Spotkanie zostało zarezerwowane. Potwierdzenie zostało wysłane na adres <strong>{attendeeEmail}</strong>.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700 mb-1">
              <strong>Z kim:</strong> {user?.name}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Data:</strong> {formatDateDisplay(selectedDate)}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Godzina:</strong> {selectedTime}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-600 mt-2">Wybierz termin spotkania</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar - Date Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Wybierz datę</h2>
              <div className="space-y-2">
                {dates.map((date) => {
                  const dateStr = formatDate(date);
                  const isSelected = dateStr === selectedDate;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime('');
                        setShowForm(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">
                        {date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div className="lg:col-span-2">
            {!showForm ? (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Dostępne terminy - {selectedDate && formatDateDisplay(selectedDate)}
                </h2>

                {slots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Brak dostępnych terminów w wybranym dniu
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {slots
                      .filter((slot) => slot.available)
                      .map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                        >
                          {slot.time}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-6">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTime('');
                  }}
                  className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Wróć do wyboru terminu
                </button>

                <h2 className="text-lg font-bold text-gray-900 mb-4">Potwierdź rezerwację</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
                      Twoje imię i nazwisko
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Jan Kowalski"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="jan@example.com"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
