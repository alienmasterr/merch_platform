import { ValidationError, type RecipientDetails } from '@merch/contracts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Український мобільний: 0XXXXXXXXX, 380XXXXXXXXX, +38 (0XX) XXX-XX-XX тощо. */
const UA_PHONE_DIGITS = /^(38)?0\d{9}$/;

/** Перевіряє й нормалізує дані отримувача. Кидає ValidationError з першою знайденою проблемою. */
export function createRecipientDetails(input: RecipientDetails): RecipientDetails {
  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  if (fullName.split(' ').length < 2) throw new ValidationError('Recipient full name must contain last name and first name');

  const digits = input.phone.replace(/[\s()+-]/g, '');
  if (!UA_PHONE_DIGITS.test(digits)) throw new ValidationError('Recipient phone must be a Ukrainian number, e.g. 0501234567');

  const email = input.email.trim();
  if (!EMAIL.test(email)) throw new ValidationError('Recipient email is invalid');

  const city = input.city.trim();
  if (!city) throw new ValidationError('Recipient city is required');

  const warehouse = input.warehouse.trim();
  if (!/^\d+$/.test(warehouse)) throw new ValidationError('Nova Poshta warehouse must be a number, e.g. "12"');

  return { fullName, phone: digits.startsWith('38') ? digits : `38${digits}`, email, city, warehouse };
}
