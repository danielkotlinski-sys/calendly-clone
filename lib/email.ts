import { Resend } from 'resend';
import type { User, Booking } from '@/types';

const FROM_EMAIL = 'booking@danielkotlinski.pl';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

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
  try {
    await getResend().emails.send({
      from: `Daniel Kotliński <${FROM_EMAIL}>`,
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
    });
    console.log(`✅ Email potwierdzenia wysłany do ${attendeeEmail}`);
  } catch (error) {
    console.error('❌ Błąd wysyłania emaila do uczestnika:', error);
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
  try {
    await getResend().emails.send({
      from: `Daniel Kotliński <${FROM_EMAIL}>`,
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
    });
    console.log(`✅ Email powiadomienia wysłany do ${organizer.email}`);
  } catch (error) {
    console.error('❌ Błąd wysyłania emaila do organizatora:', error);
  }
}

// Send error alert to organizer
export async function sendErrorAlert(
  organizerEmail: string,
  message: string
): Promise<void> {
  try {
    await getResend().emails.send({
      from: `System rezerwacji <${FROM_EMAIL}>`,
      to: organizerEmail,
      subject: '⚠️ Błąd systemu rezerwacji',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Błąd systemu rezerwacji</h2>
          <p>Wystąpił błąd który wymaga Twojej uwagi:</p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;">${message}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px;">Rezerwacja została zapisana w bazie danych, ale wymaga ręcznej weryfikacji.</p>
        </div>
      `,
    });
    console.log(`✅ Alert o błędzie wysłany do ${organizerEmail}`);
  } catch (error) {
    console.error('❌ Błąd wysyłania alertu:', error);
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
