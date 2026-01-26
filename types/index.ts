// TypeScript types for the booking application

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Availability {
  id: number;
  user_id: number;
  day_of_week?: number; // 0=Niedziela, 1=Poniedziałek, 2=Wtorek, etc. (optional dla date range)
  start_time: string;  // Format: "09:00"
  end_time: string;    // Format: "17:00"
  start_date?: string; // Format: "2026-01-26" (dla date range)
  end_date?: string;   // Format: "2026-02-05" (dla date range)
}

export interface MeetingSettings {
  id: number;
  user_id: number;
  duration: number; // w minutach: dowolna wartość (15, 30, 45, 60, etc.)
  minimum_notice?: number; // w godzinach: 0, 4, 8, 24, 48, 72
}

export interface Booking {
  id: number;
  user_id: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  booking_date: string; // Format: "2026-01-26"
  booking_time: string; // Format: "14:00"
  duration: number;
  google_calendar_event_id?: string;
  google_meet_link?: string;
  created_at: string;
}

export interface GoogleCalendarToken {
  id: number;
  user_id: number;
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface CreateUserDto {
  username: string;
  email: string;
  name: string;
}

export interface CreateBookingDto {
  user_id: number;
  attendee_name: string;
  attendee_email: string;
  booking_date: string;
  booking_time: string;
  duration: number;
}

export interface AvailabilityDto {
  user_id: number;
  day_of_week?: number;
  start_time: string;
  end_time: string;
  start_date?: string;
  end_date?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees?: string[];
  meetLink?: string;
  htmlLink?: string;
}
