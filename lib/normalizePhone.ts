/**
 * Reduces any Georgian phone format to the canonical 9-digit form.
 * 555112233 / 0555112233 / +995555112233 / 995555112233 → "555112233"
 */
export function normalizePhone(raw: string | null | undefined): string {
  let d = String(raw ?? '').replace(/\D/g, '')
  // strip +995 / 995 country code (results in ≥12 digits → 9)
  if (d.startsWith('995') && d.length >= 12) d = d.slice(3)
  // strip leading 0 (0XXXXXXXXX → XXXXXXXXX)
  if (d.startsWith('0') && d.length >= 10) d = d.slice(1)
  return d
}
