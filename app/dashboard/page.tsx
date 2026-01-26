'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Booking, MeetingSettings } from '@/types';
import { formatDateDisplay } from '@/lib/utils';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Availability state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);

  // Get user ID from cookie
  const getUserId = () => {
    const cookies = document.cookie.split(';');
    const userIdCookie = cookies.find((c) => c.trim().startsWith('userId='));
    return userIdCookie ? parseInt(userIdCookie.split('=')[1]) : null;
  };

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      router.push('/');
      return;
    }

    loadUserData(userId);
  }, [router]);

  const loadUserData = async (userId: number) => {
    try {
      // Load user
      const userRes = await fetch(`/api/users/${userId}`);
      if (!userRes.ok) throw new Error('Failed to load user');
      const userData = await userRes.json();
      setUser(userData);

      // Load bookings
      const bookingsRes = await fetch(`/api/bookings?userId=${userId}`);
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData);
      }

      // Load meeting settings
      const settingsRes = await fetch(`/api/meeting-settings?userId=${userId}`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setMeetingSettings(settingsData);
        setDuration(settingsData.duration);
      }

      // Load availability
      const availabilityRes = await fetch(`/api/availability?userId=${userId}`);
      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        if (availabilityData.length > 0) {
          const uniqueDays = Array.from(new Set(availabilityData.map((a: any) => a.day_of_week as number))) as number[];
          setSelectedDays(uniqueDays);
          setStartTime(availabilityData[0].start_time);
          setEndTime(availabilityData[0].end_time);
        }
      }

      setLoading(false);
    } catch (err) {
      setError('Wystąpił błąd podczas ładowania danych');
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setError('');
    setSuccessMessage('');

    try {
      // Save availability
      const availabilityPayload = selectedDays.map((day) => ({
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      }));

      const availabilityRes = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          availability: availabilityPayload,
        }),
      });

      if (!availabilityRes.ok) throw new Error('Failed to save availability');

      // Save meeting duration
      const durationRes = await fetch('/api/meeting-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          duration,
        }),
      });

      if (!durationRes.ok) throw new Error('Failed to save duration');

      setSuccessMessage('Ustawienia zostały zapisane!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reload data
      loadUserData(user.id);
    } catch (err) {
      setError('Wystąpił błąd podczas zapisywania ustawień');
    }
  };

  const handleDayToggle = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const copyToClipboard = () => {
    if (user) {
      const url = `${window.location.origin}/${user.username}`;
      navigator.clipboard.writeText(url);
      setSuccessMessage('Link skopiowany do schowka!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const days = [
    { value: 1, label: 'Pon' },
    { value: 2, label: 'Wt' },
    { value: 3, label: 'Śr' },
    { value: 4, label: 'Czw' },
    { value: 5, label: 'Pt' },
    { value: 6, label: 'Sob' },
    { value: 0, label: 'Ndz' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">Panel użytkownika</h1>
            <div className="text-sm text-gray-600">
              Zalogowany jako: <span className="font-semibold">{user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Booking Link */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Twój link do bookingu</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${user.username}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Kopiuj
                </button>
              </div>
            </div>

            {/* Availability Settings */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Dostępność</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Wybierz dni tygodnia
                </label>
                <div className="flex flex-wrap gap-2">
                  {days.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => handleDayToggle(day.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedDays.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Od godziny
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Do godziny
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Długość spotkania
                </label>
                <div className="flex gap-4">
                  {[15, 30, 60].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setDuration(dur as 15 | 30 | 60)}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                        duration === dur
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {dur} min
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Zapisz ustawienia
              </button>
            </div>
          </div>

          {/* Right Column - Bookings */}
          <div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Nadchodzące spotkania ({bookings.length})
              </h2>

              {bookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nie masz jeszcze żadnych rezerwacji
                </p>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{booking.attendee_name}</h3>
                        <span className="text-sm text-gray-500">{booking.duration} min</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{booking.attendee_email}</p>
                      <p className="text-sm text-gray-800 font-medium">
                        {formatDateDisplay(booking.booking_date)} o {booking.booking_time}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
