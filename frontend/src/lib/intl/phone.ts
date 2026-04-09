import {
  COUNTRY_DIAL_CODE_DATA,
  type CountryIso2,
} from "@/lib/intl/country-dial-code-data";

export type { CountryIso2 } from "@/lib/intl/country-dial-code-data";

export type CountryDialCodeOption = {
  iso2: CountryIso2;
  dialCode: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  priority: number;
};

export type NormalizedPhoneResult =
  | {
      ok: true;
      countryIso2: CountryIso2;
      dialCode: string;
      nationalNumber: string;
      e164: string;
      isValid: boolean;
    }
  | {
      ok: false;
      code:
        | "missing_country"
        | "missing_number"
        | "invalid_number"
        | "unsupported_country";
      message: string;
      countryIso2?: CountryIso2;
      dialCode?: string;
      nationalNumber?: string;
      e164?: string;
      isValid: false;
    };

const PREFERRED_COUNTRY_ORDER: CountryIso2[] = [
  "YE",
  "SA",
  "AE",
  "QA",
  "KW",
  "BH",
  "OM",
  "EG",
  "JO",
  "TR",
  "GB",
  "US",
];

const regionNamesAr =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["ar"], { type: "region" })
    : null;

const regionNamesEn =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function flagFromIso2(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(char.charCodeAt(0) + 127397),
    );
}

function getCountryPriority(iso2: CountryIso2): number {
  const index = PREFERRED_COUNTRY_ORDER.indexOf(iso2);
  return index === -1 ? PREFERRED_COUNTRY_ORDER.length + 1 : index;
}

export const COUNTRY_DIAL_CODE_OPTIONS: CountryDialCodeOption[] =
  COUNTRY_DIAL_CODE_DATA.map(({ iso2, dialCode }) => ({
    iso2,
    dialCode,
    nameAr: regionNamesAr?.of(iso2) ?? iso2,
    nameEn: regionNamesEn?.of(iso2) ?? iso2,
    flag: flagFromIso2(iso2),
    priority: getCountryPriority(iso2),
  })).sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.nameAr.localeCompare(right.nameAr, "ar");
  });

export const DEFAULT_COUNTRY_ISO2: CountryIso2 = "YE";

export function findCountryDialCodeOption(
  iso2: CountryIso2 | string | null | undefined,
): CountryDialCodeOption | undefined {
  if (!iso2) {
    return COUNTRY_DIAL_CODE_OPTIONS.find(
      (option) => option.iso2 === DEFAULT_COUNTRY_ISO2,
    );
  }

  return COUNTRY_DIAL_CODE_OPTIONS.find(
    (option) => option.iso2 === iso2.toUpperCase(),
  );
}

export function normalizeNationalNumberInput(value: string): string {
  return value.replace(/\D+/g, "");
}

function normalizeDialCodeInput(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function trimTrunkPrefix(value: string): string {
  return value.replace(/^0+/, "");
}

export function normalizePhoneValue(params: {
  countryIso2?: CountryIso2 | string | null;
  dialCode?: string | null;
  nationalNumber?: string | null;
}): NormalizedPhoneResult {
  const selectedCountry = findCountryDialCodeOption(params.countryIso2);
  const dialCode = normalizeDialCodeInput(
    params.dialCode ?? selectedCountry?.dialCode ?? "",
  );
  const nationalNumber = trimTrunkPrefix(
    normalizeNationalNumberInput(params.nationalNumber ?? ""),
  );

  if (!selectedCountry) {
    return {
      ok: false,
      code: "unsupported_country",
      message: "تعذر تحديد الدولة المختارة.",
      nationalNumber,
      isValid: false,
    };
  }

  if (!dialCode) {
    return {
      ok: false,
      code: "missing_country",
      message: "اختر الدولة أولًا.",
      countryIso2: selectedCountry.iso2,
      nationalNumber,
      isValid: false,
    };
  }

  if (!nationalNumber) {
    return {
      ok: false,
      code: "missing_number",
      message: "أدخل رقم الهاتف.",
      countryIso2: selectedCountry.iso2,
      dialCode,
      nationalNumber,
      isValid: false,
    };
  }

  const e164 = `${dialCode}${nationalNumber}`;
  const totalDigits = e164.replace(/[^\d]/g, "").length;
  const isValid = totalDigits >= 8 && totalDigits <= 15;

  if (!isValid) {
    return {
      ok: false,
      code: "invalid_number",
      message: "رقم الهاتف غير صالح.",
      countryIso2: selectedCountry.iso2,
      dialCode,
      nationalNumber,
      e164,
      isValid: false,
    };
  }

  return {
    ok: true,
    countryIso2: selectedCountry.iso2,
    dialCode,
    nationalNumber,
    e164,
    isValid,
  };
}

export function parseStoredPhoneValue(
  value: string | null | undefined,
  fallbackCountryIso2: CountryIso2 = DEFAULT_COUNTRY_ISO2,
): {
  countryIso2: CountryIso2;
  nationalNumber: string;
  dialCode: string;
  e164: string;
  isValid: boolean;
} {
  const fallbackCountry =
    findCountryDialCodeOption(fallbackCountryIso2) ??
    COUNTRY_DIAL_CODE_OPTIONS[0];

  if (!value?.trim()) {
    return {
      countryIso2: fallbackCountry.iso2,
      nationalNumber: "",
      dialCode: fallbackCountry.dialCode,
      e164: "",
      isValid: false,
    };
  }

  const raw = value.trim();
  const digits = raw.replace(/[^\d+]/g, "");

  if (!digits.startsWith("+")) {
    const normalized = normalizePhoneValue({
      countryIso2: fallbackCountry.iso2,
      nationalNumber: digits,
    });

    if (normalized.ok) {
      return normalized;
    }

    return {
      countryIso2: fallbackCountry.iso2,
      nationalNumber: normalizeNationalNumberInput(digits),
      dialCode: fallbackCountry.dialCode,
      e164: digits,
      isValid: false,
    };
  }

  const matchedOption = [...COUNTRY_DIAL_CODE_OPTIONS]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((option) => digits.startsWith(option.dialCode));

  if (!matchedOption) {
    return {
      countryIso2: fallbackCountry.iso2,
      nationalNumber: normalizeNationalNumberInput(digits),
      dialCode: fallbackCountry.dialCode,
      e164: digits,
      isValid: false,
    };
  }

  const nationalNumber = trimTrunkPrefix(
    normalizeNationalNumberInput(digits.slice(matchedOption.dialCode.length)),
  );

  const normalized = normalizePhoneValue({
    countryIso2: matchedOption.iso2,
    nationalNumber,
  });

  if (normalized.ok) {
    return normalized;
  }

  return {
    countryIso2: matchedOption.iso2,
    nationalNumber,
    dialCode: matchedOption.dialCode,
    e164: `${matchedOption.dialCode}${nationalNumber}`,
    isValid: false,
  };
}

export function filterCountryDialCodeOptions(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return COUNTRY_DIAL_CODE_OPTIONS;
  }

  return COUNTRY_DIAL_CODE_OPTIONS.filter((option) => {
    const searchHaystack = [
      option.iso2.toLowerCase(),
      option.nameAr.toLowerCase(),
      option.nameEn.toLowerCase(),
      option.dialCode.toLowerCase(),
      option.dialCode.replace("+", ""),
    ];

    return searchHaystack.some((value) => value.includes(normalizedQuery));
  });
}
