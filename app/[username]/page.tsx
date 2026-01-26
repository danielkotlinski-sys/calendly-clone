'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, MeetingType } from '@/types';

export default function UserBookingLandingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [username]);

  const loadData = async () => {
    try {
      // Load user
      const userRes = await fetch(`/api/users/${username}`);
      if (!userRes.ok) {
        setError('Użytkownik nie został znaleziony');
        setLoading(false);
        return;
      }
      const userData = await userRes.json();
      setUser(userData);

      // Load meeting types
      const typesRes = await fetch(`/api/meeting-types?userId=${userData.id}`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setMeetingTypes(typesData);

        // If only one meeting type, redirect to it
        if (typesData.length === 1) {
          router.push(`/${username}/${typesData[0].slug}`);
          return;
        }

        // If multiple types but one is default, could redirect to default
        // For now, show all types
      }

      setLoading(false);
    } catch (err) {
      setError('Wystąpił błąd podczas ładowania danych');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-red-200">
          <div className="text-red-700 text-xl">{error}</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {user.name}
            </h1>
            <p className="text-gray-600 mt-3 text-lg">Wybierz typ spotkania</p>
          </div>
        </div>
      </header>

      {/* Meeting Types Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {meetingTypes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak dostępnych typów spotkań</h3>
            <p className="text-gray-600">Ten użytkownik nie ma jeszcze skonfigurowanych typów spotkań.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {meetingTypes.map((meetingType) => (
              <a
                key={meetingType.id}
                href={`/${username}/${meetingType.slug}`}
                className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:border-indigo-300 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                      {meetingType.name}
                    </h3>
                    {meetingType.is_default && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        Domyślny
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-gray-600 mb-6">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-lg font-medium">{meetingType.duration} minut</span>
                </div>

                <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span>Zarezerwuj termin</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
