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
  day_of_week: number; // 0=Niedziela, 1=Poniedziałek, 2=Wtorek, etc.
  start_time: string;  // Format: "09:00"
  end_time: string;    // Format: "17:00"
}

export interface MeetingSettings {
  id: number;
  user_id: number;
  duration: number; // w minutach: 15, 30, lub 60
}

export interface Booking {
  id: number;
  user_id: number;
  attendee_name: string;
  attendee_email: string;
  booking_date: string; // Format: "2026-01-26"
  booking_time: string; // Format: "14:00"
  duration: number;
  created_at: string;
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
  day_of_week: number;
  start_time: string;
  end_time: string;
}
