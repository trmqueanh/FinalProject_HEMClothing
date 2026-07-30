const VIETNAM_MOBILE_LOCAL_PATTERN = /^[35789]\d{8}$/;
const PHONE_INPUT_PATTERN = /^[+\d\s().-]+$/;

const normalizeVietnamPhone = value => {
  const rawPhone = String(value || '').trim();

  if (!rawPhone || !PHONE_INPUT_PATTERN.test(rawPhone)) {
    return '';
  }

  const digits = rawPhone.replace(/\D/g, '');
  let localNumber = digits;

  if (digits.startsWith('84')) {
    localNumber = digits.slice(2);
  } else if (digits.startsWith('0')) {
    localNumber = digits.slice(1);
  }

  if (!VIETNAM_MOBILE_LOCAL_PATTERN.test(localNumber)) {
    return '';
  }

  return `+84${localNumber}`;
};

const isValidVietnamPhone = value => Boolean(normalizeVietnamPhone(value));

module.exports = {
  isValidVietnamPhone,
  normalizeVietnamPhone
};
