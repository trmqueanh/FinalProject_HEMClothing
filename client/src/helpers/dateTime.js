export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const VIETNAM_UTC_OFFSET_HOURS = 7;

const parseDate = value => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatVietnamDate = (value, options = {}, fallback = '') => {
  const date = parseDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    ...options
  }).format(date);
};

export const getVietnamDateParts = (value = new Date()) => {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
    .formatToParts(date)
    .reduce((parts, part) => {
      if (part.type !== 'literal') {
        parts[part.type] = Number(part.value);
      }
      return parts;
    }, {});
};

export const getVietnamCurrentYear = () => getVietnamDateParts().year;

export const toVietnamDateTimeLocal = value => {
  const parts = getVietnamDateParts(value);

  if (!parts) {
    return '';
  }

  const pad = number => String(number).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

export const vietnamDateTimeLocalToIso = value => {
  const match = String(value || '').trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = '0'] = match;
  const utcTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - VIETNAM_UTC_OFFSET_HOURS,
    Number(minute),
    Number(second)
  );
  const date = new Date(utcTime);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
