import { Share } from 'react-native';

/**
 * receipt.js — builds a shareable text bill receipt from a booking record and opens the native
 * share sheet (Phase 13). Replaces the earlier "PDF arrives later" Alert stubs on the booking
 * confirmation, tracker, and history screens.
 *
 * Why text-share instead of a generated PDF: a real PDF needs a native module
 * (react-native-html-to-pdf / react-native-pdf-lib) that would require another Gradle rebuild and
 * carries New-Arch compatibility risk. The RN `Share` API is built in, works today, and lets the
 * user send the receipt to WhatsApp / email / Drive / print apps — which covers the actual user
 * need ("give me my bill"). The breakdown numbers come straight off the persisted booking record,
 * so they match what calcBilling produced at booking time.
 */

const RUPEE = '\u20B9';

// Recompute the invoice line items from whatever the booking record carries. Newer records
// (created via BookingScreen) store gst + welfareCess; older/seed records only store basePrice +
// weatherMultiplier + totalPrice, so we derive the pieces the same way calcBilling did.
function lineItems(booking) {
  const adjusted = Math.round((booking.basePrice || 0) * (booking.weatherMultiplier || 1));
  const gst = booking.gst != null ? booking.gst : Math.round(adjusted * 0.18);
  const welfareCess = booking.welfareCess != null ? booking.welfareCess : Math.round(adjusted * 0.02);
  const total = booking.totalPrice != null ? booking.totalPrice : adjusted + gst + welfareCess;
  const weatherSurcharge = adjusted - (booking.basePrice || 0);
  return { adjusted, gst, welfareCess, total, weatherSurcharge };
}

export function buildReceiptText(booking) {
  const { gst, welfareCess, total, weatherSurcharge } = lineItems(booking);
  const lines = [
    'SAHAKAR SEVA — Tax Invoice / Receipt',
    'Cooperative Home Services',
    '--------------------------------------',
    `Booking ID : #${booking.id}`,
    `Service    : ${booking.serviceName}`,
    `Technician : ${booking.workerName}${booking.workerRating ? ` (${booking.workerRating}\u2605)` : ''}`,
    `Date/Time  : ${booking.date} at ${booking.time}`,
    `Address    : ${booking.address}`,
    booking.status ? `Status     : ${booking.status}` : null,
    '--------------------------------------',
    `Base charge            ${RUPEE}${booking.basePrice || 0}`,
    weatherSurcharge > 0 ? `Weather adj (${booking.weatherCondition || 'surge'})  ${RUPEE}${weatherSurcharge}` : null,
    `GST (18%)              ${RUPEE}${gst}`,
    `Cooperative cess (2%)  ${RUPEE}${welfareCess}`,
    '--------------------------------------',
    `TOTAL PAID             ${RUPEE}${total}`,
    '--------------------------------------',
    'Thank you for choosing Sahakar Seva.',
    'Helpline: 1800-XXX-SEVA (24x7 Toll-Free)',
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Opens the native share sheet with the formatted receipt. Returns the Share result; callers can
 * ignore it. Errors (e.g. user dismissing) are swallowed so no crash/alert leaks through.
 */
export async function shareReceipt(booking) {
  try {
    await Share.share({
      title: `Sahakar Seva Receipt #${booking.id}`,
      message: buildReceiptText(booking),
    });
  } catch {
    // user cancelled or share unavailable — no-op
  }
}
