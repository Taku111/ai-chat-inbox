/**
 * Normalize a phone number to E.164 format.
 * Strips the "whatsapp:" prefix if present.
 * Throws if the result is not a valid E.164 number.
 */
export function normalizePhone(raw: string): string {
  let phone = raw.trim()
  if (phone.startsWith('whatsapp:')) {
    phone = phone.slice('whatsapp:'.length)
  }
  phone = phone.trim()
  if (!isE164(phone)) {
    throw new Error(`Invalid E.164 phone number: ${raw}`)
  }
  return phone
}

export function isE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone)
}

export function stripWhatsAppPrefix(raw: string): string {
  return raw.startsWith('whatsapp:') ? raw.slice('whatsapp:'.length) : raw
}
