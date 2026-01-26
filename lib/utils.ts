import { type ClassValue, clsx } from 'clsx';

// Helper to generate time slots based on availability
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number
): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    currentMinutes += duration;
  }

  return slots;
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get day of week (0 = Sunday, 1 = Monday, etc.)
export function getDayOfWeek(dateString: string): number {
  return new Date(dateString).getDay();
}

// Format date for display (Polish format)
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Get day name in Polish
export function getDayName(dayOfWeek: number): string {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  return days[dayOfWeek];
}

// Get short day name in Polish
export function getShortDayName(dayOfWeek: number): string {
  const days = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
  return days[dayOfWeek];
}

// Generate array of dates for the next N days
export function getNextDays(count: number, startDate: Date = new Date()): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Check if date is in the past
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate username (alphanumeric and hyphens only)
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-z0-9-]+$/;
  return usernameRegex.test(username);
}
