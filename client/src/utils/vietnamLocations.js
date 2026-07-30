const VIETNAM_LOCATIONS_ENDPOINT = 'https://provinces.open-api.vn/api/?depth=3';
const CACHE_KEY = 'hem-vietnam-locations-v1';

export const VIETNAM_PHONE_CODES = [
  {
    value: '+84',
    label: 'Vietnam +84'
  }
];

const VIETNAM_MOBILE_LOCAL_PATTERN = /^[35789]\d{8}$/;
const PHONE_INPUT_PATTERN = /^[+\d\s().-]+$/;

const FALLBACK_LOCATIONS = [
  {
    name: 'Ho Chi Minh City',
    districts: [
      {
        name: 'District 1',
        wards: ['Ben Nghe Ward', 'Ben Thanh Ward', 'Da Kao Ward', 'Nguyen Thai Binh Ward']
      },
      {
        name: 'Binh Thanh District',
        wards: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 14']
      },
      {
        name: 'Thu Duc City',
        wards: ['Thao Dien Ward', 'Linh Trung Ward', 'Hiep Binh Chanh Ward']
      }
    ]
  },
  {
    name: 'Ha Noi City',
    districts: [
      {
        name: 'Hoan Kiem District',
        wards: ['Hang Bac Ward', 'Hang Dao Ward', 'Trang Tien Ward']
      },
      {
        name: 'Cau Giay District',
        wards: ['Dich Vong Ward', 'Nghia Tan Ward', 'Mai Dich Ward']
      }
    ]
  },
  {
    name: 'Da Nang City',
    districts: [
      {
        name: 'Hai Chau District',
        wards: ['Hai Chau I Ward', 'Hai Chau II Ward', 'Thach Thang Ward']
      },
      {
        name: 'Son Tra District',
        wards: ['An Hai Bac Ward', 'An Hai Dong Ward', 'Phuoc My Ward']
      }
    ]
  }
];

const safeWindow = () => (typeof window === 'undefined' ? null : window);

const normalizeLocations = value =>
  (Array.isArray(value) ? value : [])
    .map(province => ({
      name: String(province.name || '').trim(),
      districts: (Array.isArray(province.districts) ? province.districts : [])
        .map(district => ({
          name: String(district.name || '').trim(),
          wards: (Array.isArray(district.wards) ? district.wards : [])
            .map(ward => String(ward.name || ward).trim())
            .filter(Boolean)
        }))
        .filter(district => district.name)
    }))
    .filter(province => province.name);

const readCachedLocations = () => {
  const browserWindow = safeWindow();

  if (!browserWindow || !browserWindow.localStorage) {
    return [];
  }

  try {
    return normalizeLocations(JSON.parse(browserWindow.localStorage.getItem(CACHE_KEY) || '[]'));
  } catch {
    return [];
  }
};

const writeCachedLocations = locations => {
  const browserWindow = safeWindow();

  if (!browserWindow || !browserWindow.localStorage) {
    return;
  }

  try {
    browserWindow.localStorage.setItem(CACHE_KEY, JSON.stringify(locations));
  } catch {
    // Cache is an enhancement only; checkout must still work without it.
  }
};

export const loadVietnamLocations = async () => {
  const cachedLocations = readCachedLocations();

  if (cachedLocations.length) {
    return cachedLocations;
  }

  try {
    const response = await fetch(VIETNAM_LOCATIONS_ENDPOINT);
    const remoteLocations = normalizeLocations(await response.json());

    if (remoteLocations.length) {
      writeCachedLocations(remoteLocations);
      return remoteLocations;
    }
  } catch {
    // The fallback keeps the form usable when the public address API is offline.
  }

  return FALLBACK_LOCATIONS;
};

export const splitVietnamPhone = value => {
  const normalized = String(value || '').replace(/[^\d+]/g, '');

  if (normalized.startsWith('+84')) {
    return {
      code: '+84',
      local: normalized.slice(3).replace(/^0+/, '')
    };
  }

  if (normalized.startsWith('84')) {
    return {
      code: '+84',
      local: normalized.slice(2).replace(/^0+/, '')
    };
  }

  return {
    code: '+84',
    local: normalized.replace(/^0+/, '')
  };
};

export const sanitizeVietnamPhoneLocal = value =>
  String(value || '').replace(/\D/g, '').slice(0, 10);

export const isValidVietnamPhoneParts = (code, localNumber) => {
  if (String(code || '').trim() !== '+84') {
    return false;
  }

  const localDigits = sanitizeVietnamPhoneLocal(localNumber).replace(/^0/, '');
  return VIETNAM_MOBILE_LOCAL_PATTERN.test(localDigits);
};

export const normalizeVietnamPhone = value => {
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

  return VIETNAM_MOBILE_LOCAL_PATTERN.test(localNumber)
    ? `+84${localNumber}`
    : '';
};

export const isValidVietnamPhone = value => Boolean(normalizeVietnamPhone(value));

export const buildVietnamPhone = (code, localNumber) => {
  const cleanCode = String(code || '+84').trim() || '+84';
  const cleanLocal = String(localNumber || '').replace(/\D/g, '').replace(/^0+/, '');

  return cleanLocal ? `${cleanCode}${cleanLocal}` : '';
};
