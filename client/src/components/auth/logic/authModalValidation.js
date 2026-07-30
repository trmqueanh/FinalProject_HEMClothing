// Quy tắc kiểm tra dữ liệu dùng chung cho computed state và submit của AuthModal.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BIRTHDAY_MASK = 'DD/MM/YYYY';

export const getBirthDateDigits = value => String(value || '').replace(/\D/g, '').slice(0, 8);

export const formatBirthDateMask = value => {
  const digits = getBirthDateDigits(value);
  const slots = BIRTHDAY_MASK.split('');
  let digitIndex = 0;

  return slots
    .map(character => {
      if (!/[DMY]/.test(character)) {
        return character;
      }

      if (digitIndex >= digits.length) {
        return character;
      }

      const nextDigit = digits[digitIndex];
      digitIndex += 1;
      return nextDigit;
    })
    .join('');
};

export const isValidBirthDate = value => {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return false;

  const [, day, month, year] = match;
  const parsedDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.getUTCFullYear() === Number(year) &&
    parsedDate.getUTCMonth() + 1 === Number(month) &&
    parsedDate.getUTCDate() === Number(day)
  );
};

export const isStrongPassword = password =>
  String(password || '').length >= 8 &&
  String(password || '').length <= 25 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  !/\s/.test(password);
