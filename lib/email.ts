import nodemailer from 'nodemailer';
import type { User, Booking } from '@/types';

// Configure email transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send booking confirmation to the attendee
export async function sendAttendeeConfirmation(
  attendeeName: string,
  attendeeEmail: string,
  organizerName: string,
  organizerEmail: string,
  bookingDate: string,
  bookingTime: string,
  duration: number
): Promise<void> {
  const mailOptions = {
    from: `"Calendly Clone" <${process.env.EMAIL_USER}>`,
    to: attendeeEmail,
    subject: 'Potwierdzenie rezerwacji spotkania',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Spotkanie zostało zarezerwowane!</h2>
        <p>Cześć ${attendeeName},</p>
        <p>Twoje spotkanie zostało potwierdzone. Oto szczegóły:</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Z kim:</strong> ${organizerName}</p>
          <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(bookingDate).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="margin: 5px 0;"><strong>Godzina:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Czas trwania:</strong> ${duration} minut</p>
        </div>

        <p>W razie pytań, skontaktuj się z organizatorem:</p>
        <p><a href="mailto:${organizerEmail}" style="color: #2563eb;">${organizerEmail}</a></p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          To jest automatyczna wiadomość z systemu rezerwacji. Proszę nie odpowiadać na ten email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email potwierdzenia wysłany do ${attendeeEmail}`);
  } catch (error) {
    console.error('❌ Błąd wysyłania emaila do uczestnika:', error);
    // Don't throw error - booking should succeed even if email fails
  }
}

// Send booking notification to the organizer
export async function sendOrganizerNotification(
  organizer: User,
  attendeeName: string,
  attendeeEmail: string,
  bookingDate: string,
  bookingTime: string,
  duration: number
): Promise<void> {
  const mailOptions = {
    from: `"Calendly Clone" <${process.env.EMAIL_USER}>`,
    to: organizer.email,
    subject: 'Nowa rezerwacja spotkania',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nowa rezerwacja!</h2>
        <p>Cześć ${organizer.name},</p>
        <p>Masz nową rezerwację spotkania:</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Uczestnik:</strong> ${attendeeName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${attendeeEmail}" style="color: #2563eb;">${attendeeEmail}</a></p>
          <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(bookingDate).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="margin: 5px 0;"><strong>Godzina:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Czas trwania:</strong> ${duration} minut</p>
        </div>

        <p>Spotkanie zostało dodane do Twojego kalendarza.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          To jest automatyczna wiadomość z systemu rezerwacji. Proszę nie odpowiadać na ten email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email powiadomienia wysłany do ${organizer.email}`);
  } catch (error) {
    console.error('❌ Błąd wysyłania emaila do organizatora:', error);
    // Don't throw error - booking should succeed even if email fails
  }
}

// Send both emails after booking
export async function sendBookingEmails(
  organizer: User,
  booking: Booking
): Promise<void> {
  await Promise.all([
    sendAttendeeConfirmation(
      booking.attendee_name,
      booking.attendee_email,
      organizer.name,
      organizer.email,
      booking.booking_date,
      booking.booking_time,
      booking.duration
    ),
    sendOrganizerNotification(
      organizer,
      booking.attendee_name,
      booking.attendee_email,
      booking.booking_date,
      booking.booking_time,
      booking.duration
    ),
  ]);
}
