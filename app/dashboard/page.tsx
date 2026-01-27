'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Booking, MeetingSettings, GoogleCalendarEvent, MeetingType } from '@/types';
import { formatDateDisplay } from '@/lib/utils';

type AvailabilityMode = 'weekdays' | 'daterange';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  // Meeting type modal state
  const [showMeetingTypeModal, setShowMeetingTypeModal] = useState(false);
  const [editingMeetingType, setEditingMeetingType] = useState<MeetingType | null>(null);
  const [mtName, setMtName] = useState('');
  const [mtSlug, setMtSlug] = useState('');
  const [mtDuration, setMtDuration] = useState(30);
  const [mtIsDefault, setMtIsDefault] = useState(false);

  // Availability state
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>('weekdays');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Meeting settings state
  const [duration, setDuration] = useState<number>(30);
  const [minimumNotice, setMinimumNotice] = useState<number>(0);

  // Get user ID from cookie
  const getUserId = () => {
    const cookies = document.cookie.split(';');
    const userIdCookie = cookies.find((c) => c.trim().startsWith('userId='));
    return userIdCookie ? parseInt(userIdCookie.split('=')[1]) : null;
  };

  useEffect(() => {
    // Check authentication first
    const isAuthenticated = localStorage.getItem('dashboard_auth');
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    let userId = getUserId();

    // If no cookie, use userId=1 (default for single user setup)
    if (!userId) {
      userId = 1;
      // Set cookie for future visits
      document.cookie = `userId=1; path=/; max-age=31536000`;
    }

    loadUserData(userId);
  }, [router]);

  // Check for OAuth callback messages and Google Calendar connection status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const errorParam = params.get('error');

    if (success === 'google_connected') {
      setSuccessMessage('Google Calendar połączony pomyślnie!');
      setGoogleCalendarConnected(true);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    }

    if (errorParam === 'google_auth_denied') {
      setError('Anulowano autoryzację Google Calendar');
      window.history.replaceState({}, '', '/dashboard');
    } else if (errorParam === 'google_auth_failed') {
      setError('Błąd autoryzacji Google Calendar');
      window.history.replaceState({}, '', '/dashboard');
    }

    // Check if Google Calendar is connected
    const checkGoogleCalendar = async () => {
      const userId = getUserId() || 1;
      try {
        const res = await fetch(`/api/auth/google/status?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setGoogleCalendarConnected(data.connected);
        }
      } catch (err) {
        console.error('Error checking Google Calendar status:', err);
      }
    };

    checkGoogleCalendar();
  }, []);

  const loadUserData = async (userId: number) => {
    try {
      // Load user
      const userRes = await fetch(`/api/users/${userId}`);
      if (!userRes.ok) throw new Error('Failed to load user');
      const userData = await userRes.json();
      setUser(userData);

      // Check if Google Calendar is connected
      const statusRes = await fetch(`/api/auth/google/status?userId=${userId}`);
      const statusData = await statusRes.json();
      const isGoogleConnected = statusData.connected;
      setGoogleCalendarConnected(isGoogleConnected);

      // Load events from Google Calendar if connected, otherwise from database
      if (isGoogleConnected) {
        const eventsRes = await fetch(`/api/calendar/events?userId=${userId}`);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setCalendarEvents(eventsData);
        }
      } else {
        const bookingsRes = await fetch(`/api/bookings?userId=${userId}`);
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
        }
      }

      // Load meeting settings
      const settingsRes = await fetch(`/api/meeting-settings?userId=${userId}`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setMeetingSettings(settingsData);
        setDuration(settingsData.duration);
        setMinimumNotice(settingsData.minimum_notice || 0);
      }

      // Load availability
      const availabilityRes = await fetch(`/api/availability?userId=${userId}`);
      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        if (availabilityData.length > 0) {
          const first = availabilityData[0];

          // Check if it's date range or weekdays
          if (first.start_date && first.end_date) {
            setAvailabilityMode('daterange');
            setStartDate(first.start_date);
            setEndDate(first.end_date);
          } else {
            setAvailabilityMode('weekdays');
            const uniqueDays = Array.from(new Set(availabilityData.map((a: any) => a.day_of_week as number))) as number[];
            setSelectedDays(uniqueDays);
          }

          setStartTime(first.start_time);
          setEndTime(first.end_time);
        }
      }

      // Load meeting types
      const typesRes = await fetch(`/api/meeting-types?userId=${userId}`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setMeetingTypes(typesData);
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
      let availabilityPayload;

      if (availabilityMode === 'weekdays') {
        if (selectedDays.length === 0) {
          setError('Wybierz przynajmniej jeden dzień tygodnia');
          return;
        }
        availabilityPayload = selectedDays.map((day) => ({
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
        }));
      } else {
        if (!startDate || !endDate) {
          setError('Wybierz zakres dat');
          return;
        }
        availabilityPayload = [{
          start_time: startTime,
          end_time: endTime,
          start_date: startDate,
          end_date: endDate,
        }];
      }

      const availabilityRes = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          availability: availabilityPayload,
        }),
      });

      if (!availabilityRes.ok) throw new Error('Failed to save availability');

      // Save meeting duration and minimum notice
      const durationRes = await fetch('/api/meeting-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          duration: duration,
          minimum_notice: minimumNotice,
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

  // Meeting Types functions
  const openMeetingTypeModal = (meetingType?: MeetingType) => {
    if (meetingType) {
      setEditingMeetingType(meetingType);
      setMtName(meetingType.name);
      setMtSlug(meetingType.slug);
      setMtDuration(meetingType.duration);
      setMtIsDefault(meetingType.is_default);
    } else {
      setEditingMeetingType(null);
      setMtName('');
      setMtSlug('');
      setMtDuration(30);
      setMtIsDefault(false);
    }
    setShowMeetingTypeModal(true);
  };

  const closeMeetingTypeModal = () => {
    setShowMeetingTypeModal(false);
    setEditingMeetingType(null);
    setMtName('');
    setMtSlug('');
    setMtDuration(30);
    setMtIsDefault(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleMeetingTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSuccessMessage('');

    const slug = mtSlug || generateSlug(mtName);

    try {
      if (editingMeetingType) {
        // Update
        const res = await fetch('/api/meeting-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingMeetingType.id,
            name: mtName,
            slug,
            duration: mtDuration,
            isDefault: mtIsDefault,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Błąd podczas aktualizacji typu spotkania');
          return;
        }
      } else {
        // Create
        const res = await fetch('/api/meeting-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            name: mtName,
            slug,
            duration: mtDuration,
            isDefault: mtIsDefault,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Błąd podczas tworzenia typu spotkania');
          return;
        }
      }

      // Reload meeting types
      const typesRes = await fetch(`/api/meeting-types?userId=${user.id}`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setMeetingTypes(typesData);
      }

      closeMeetingTypeModal();
      setSuccessMessage(
        editingMeetingType
          ? 'Typ spotkania został zaktualizowany'
          : 'Typ spotkania został utworzony'
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Wystąpił błąd połączenia');
    }
  };

  const handleDeleteMeetingType = async (id: number) => {
    if (!user) return;
    if (!confirm('Czy na pewno chcesz usunąć ten typ spotkania?')) return;

    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/meeting-types?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Błąd podczas usuwania typu spotkania');
        return;
      }

      // Reload meeting types
      const typesRes = await fetch(`/api/meeting-types?userId=${user.id}`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setMeetingTypes(typesData);
      }

      setSuccessMessage('Typ spotkania został usunięty');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Wystąpił błąd połączenia');
    }
  };

  const copyMeetingTypeLink = (slug: string) => {
    const link = `${window.location.origin}/${user?.username}/${slug}`;
    navigator.clipboard.writeText(link);
    setSuccessMessage('Link skopiowany do schowka!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_auth');
    router.push('/login');
  };

  // Helper functions for Google Calendar events
  const formatCalendarEventDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCalendarEventTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Panel użytkownika
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-xl shadow-sm">
                Zalogowany jako: <span className="font-semibold text-indigo-600">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-all"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 shadow-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl mb-8 shadow-sm">
            {successMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Settings */}
          <div className="space-y-8">
            {/* Booking Link */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 border border-indigo-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Twój link do bookingu</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${user.username}`}
                  className="flex-1 px-5 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Kopiuj
                </button>
              </div>
            </div>

            {/* Google Calendar Integration */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 border border-indigo-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Google Calendar</h2>
              {googleCalendarConnected ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-3 px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700 font-medium">Połączono z Google Calendar</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-6">
                    Połącz swój kalendarz Google, aby automatycznie blokować zajęte godziny i tworzyć spotkania z Google Meet.
                  </p>
                  <a
                    href={`/api/auth/google?userId=${user.id}`}
                    className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"/>
                      </svg>
                      Połącz z Google Calendar
                    </div>
                  </a>
                </div>
              )}
            </div>

            {/* Meeting Types */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 border border-indigo-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Typy spotkań</h2>
                <button
                  onClick={() => openMeetingTypeModal()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all font-medium text-sm"
                >
                  + Dodaj typ
                </button>
              </div>

              {meetingTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nie masz jeszcze żadnych typów spotkań.</p>
                  <p className="text-sm mt-2">Kliknij &quot;Dodaj typ&quot; żeby utworzyć pierwszy.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetingTypes.map((mt) => (
                    <div
                      key={mt.id}
                      className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-all bg-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{mt.name}</h3>
                            {mt.is_default && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                Domyślny
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 gap-4">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {mt.duration} min
                            </span>
                            <span className="text-gray-400">•</span>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">/{user.username}/{mt.slug}</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyMeetingTypeLink(mt.slug)}
                            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Kopiuj link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openMeetingTypeModal(mt)}
                            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edytuj"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteMeetingType(mt.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Usuń"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Availability Settings */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 border border-indigo-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dostępność</h2>

              {/* Mode Selector */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Typ dostępności
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAvailabilityMode('weekdays')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      availabilityMode === 'weekdays'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Dni tygodnia
                  </button>
                  <button
                    onClick={() => setAvailabilityMode('daterange')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      availabilityMode === 'daterange'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Zakres dat
                  </button>
                </div>
              </div>

              {/* Weekdays Mode */}
              {availabilityMode === 'weekdays' && (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Wybierz dni tygodnia
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {days.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => handleDayToggle(day.value)}
                        className={`px-5 py-3 rounded-xl font-medium transition-all ${
                          selectedDays.includes(day.value)
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range Mode */}
              {availabilityMode === 'daterange' && (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Zakres dat
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Od</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Do</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Od godziny
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* Meeting Duration */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Długość spotkania (w minutach)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="np. 30, 45, 60"
                />
                <p className="text-xs text-gray-500 mt-2">Wartości co 15 minut (15, 30, 45, 60, etc.)</p>
              </div>

              {/* Minimum Notice */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Minimum wyprzedzenie
                </label>
                <select
                  value={minimumNotice}
                  onChange={(e) => setMinimumNotice(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value={0}>Bez ograniczeń</option>
                  <option value={4}>Minimum 4 godziny przed</option>
                  <option value={8}>Minimum 8 godzin przed</option>
                  <option value={24}>Minimum 24 godziny przed</option>
                  <option value={48}>Minimum 48 godzin przed</option>
                  <option value={72}>Minimum 72 godziny przed</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {minimumNotice === 0
                    ? 'Klienci mogą rezerwować w dowolnym momencie'
                    : `Klienci nie zobaczą terminów bliższych niż ${minimumNotice}h`}
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl"
              >
                Zapisz ustawienia
              </button>
            </div>
          </div>

          {/* Right Column - Bookings */}
          <div>
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 border border-indigo-100 sticky top-28">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Nadchodzące spotkania ({googleCalendarConnected ? calendarEvents.length : bookings.length})
              </h2>

              {/* Display Google Calendar events if connected */}
              {googleCalendarConnected ? (
                calendarEvents.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
                      <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Nie masz nadchodzących spotkań</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {calendarEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900 text-lg">{event.summary || 'Bez tytułu'}</h3>
                          <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full">
                            {getEventDuration(event.start, event.end)} min
                          </span>
                        </div>
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {event.attendees.join(', ')}
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-gray-800 font-medium flex items-center mb-2">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatCalendarEventDate(event.start)} o {formatCalendarEventTime(event.start)}
                        </p>
                        <div className="flex gap-2 mt-3">
                          {event.meetLink && (
                            <a
                              href={event.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 3H7C5.9 3 5 3.9 5 5v6l-3 3v5h5l3 3h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                              </svg>
                              Dołącz przez Google Meet
                            </a>
                          )}
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 font-medium ml-auto"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Otwórz w Google Calendar
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Display database bookings if Google Calendar not connected */
                bookings.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
                      <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Nie masz jeszcze żadnych rezerwacji</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900 text-lg">{booking.attendee_name}</h3>
                          <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full">
                            {booking.duration} min
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {booking.attendee_email}
                        </p>
                        {booking.attendee_phone && (
                          <p className="text-sm text-gray-600 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {booking.attendee_phone}
                          </p>
                        )}
                        <p className="text-sm text-gray-800 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateDisplay(booking.booking_date)} o {booking.booking_time}
                        </p>
                        {booking.google_meet_link && (
                          <a
                            href={booking.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 3H7C5.9 3 5 3.9 5 5v6l-3 3v5h5l3 3h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                            </svg>
                            Dołącz przez Google Meet
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Meeting Type Modal */}
      {showMeetingTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {editingMeetingType ? 'Edytuj typ spotkania' : 'Nowy typ spotkania'}
            </h3>

            <form onSubmit={handleMeetingTypeSubmit} className="space-y-5">
              <div>
                <label htmlFor="mt-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nazwa *
                </label>
                <input
                  type="text"
                  id="mt-name"
                  required
                  value={mtName}
                  onChange={(e) => setMtName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="np. Konsultacja 30 min"
                />
              </div>

              <div>
                <label htmlFor="mt-slug" className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  id="mt-slug"
                  required
                  value={mtSlug}
                  onChange={(e) => setMtSlug(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="konsultacja-30"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Link: /{user?.username}/{mtSlug || generateSlug(mtName)}
                </p>
              </div>

              <div>
                <label htmlFor="mt-duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Długość (minuty) *
                </label>
                <input
                  type="number"
                  id="mt-duration"
                  required
                  min="15"
                  max="480"
                  step="15"
                  value={mtDuration}
                  onChange={(e) => setMtDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mt-default"
                  checked={mtIsDefault}
                  onChange={(e) => setMtIsDefault(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="mt-default" className="ml-2 text-sm text-gray-700">
                  Ustaw jako domyślny typ spotkania
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeMeetingTypeModal}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  {editingMeetingType ? 'Zapisz' : 'Utwórz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
