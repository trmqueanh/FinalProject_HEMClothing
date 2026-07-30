const PASSWORD_RULE_MESSAGE =
  'Password must be 8-25 characters and include 1 number, 1 uppercase letter, 1 lowercase letter, and no spaces.';

const isStrongMemberPassword = password =>
  String(password || '').length >= 8 &&
  String(password || '').length <= 25 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  !/\s/.test(password);

const parseMemberBirthDate = value => {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return null;
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const displayMatch = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!isoMatch && !displayMatch) {
    return null;
  }

  const [, year, month, day] = isoMatch || ['', displayMatch[3], displayMatch[2], displayMatch[1]];
  const parsedDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() + 1 !== Number(month) ||
    parsedDate.getUTCDate() !== Number(day) ||
    parsedDate.getTime() > today
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

const serializeMemberBirthDate = value => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }

    const year = String(value.getFullYear()).padStart(4, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return parseMemberBirthDate(`${year}-${month}-${day}`) || '';
  }

  return parseMemberBirthDate(String(value).slice(0, 10)) || '';
};

module.exports = {
  PASSWORD_RULE_MESSAGE,
  isStrongMemberPassword,
  parseMemberBirthDate,
  serializeMemberBirthDate
};
