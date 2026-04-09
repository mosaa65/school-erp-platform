"use client";

import * as React from "react";
import { ContactRound, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryDialCodePicker } from "@/components/ui/country-dial-code-picker";
import {
  DEFAULT_COUNTRY_ISO2,
  findCountryDialCodeOption,
  normalizeNationalNumberInput,
  normalizePhoneValue,
  parseStoredPhoneValue,
  type CountryIso2,
} from "@/lib/intl/phone";
import { cn } from "@/lib/utils";
import {
  pickSinglePhoneContact,
  supportsContactPicker,
} from "@/lib/phone-contact-picker";

export type InternationalPhoneFieldChange = {
  countryIso2: CountryIso2;
  dialCode: string;
  nationalNumber: string;
  e164: string;
  isValid: boolean;
  message?: string;
};

type InternationalPhoneFieldProps = {
  countryIso2?: CountryIso2 | string | null;
  nationalNumber?: string;
  value?: string | null;
  onChange: (next: InternationalPhoneFieldChange) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  enableContactPicker?: boolean;
  buttonTestId?: string;
  className?: string;
  inputClassName?: string;
};

export function InternationalPhoneField({
  countryIso2,
  nationalNumber,
  value,
  onChange,
  placeholder = "7XXXXXXXX",
  disabled = false,
  required = false,
  enableContactPicker = false,
  buttonTestId,
  className,
  inputClassName,
}: InternationalPhoneFieldProps) {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isPicking, setIsPicking] = React.useState(false);

  React.useEffect(() => {
    setIsSupported(enableContactPicker && supportsContactPicker());
  }, [enableContactPicker]);

  const resolvedValue = React.useMemo(() => {
    if (typeof value === "string") {
      return parseStoredPhoneValue(value, DEFAULT_COUNTRY_ISO2);
    }

    return normalizePhoneValue({
      countryIso2: countryIso2 ?? DEFAULT_COUNTRY_ISO2,
      nationalNumber: nationalNumber ?? "",
    });
  }, [countryIso2, nationalNumber, value]);

  const resolvedCountryIso2 =
    "ok" in resolvedValue
      ? resolvedValue.ok
        ? resolvedValue.countryIso2
        : resolvedValue.countryIso2 ?? DEFAULT_COUNTRY_ISO2
      : resolvedValue.countryIso2 ?? DEFAULT_COUNTRY_ISO2;

  const selectedCountry =
    findCountryDialCodeOption(resolvedCountryIso2) ??
    findCountryDialCodeOption(DEFAULT_COUNTRY_ISO2)!;

  const resolvedNationalNumber =
    "ok" in resolvedValue
      ? resolvedValue.ok
        ? resolvedValue.nationalNumber ?? ""
        : resolvedValue.nationalNumber ?? ""
      : resolvedValue.nationalNumber ?? "";

  const emitNextValue = React.useCallback(
    (nextCountryIso2: CountryIso2, nextNationalNumber: string) => {
      const normalized = normalizePhoneValue({
        countryIso2: nextCountryIso2,
        nationalNumber: nextNationalNumber,
      });

      if (normalized.ok) {
        onChange({
          countryIso2: normalized.countryIso2,
          dialCode: normalized.dialCode,
          nationalNumber: normalized.nationalNumber,
          e164: normalized.e164,
          isValid: normalized.isValid,
        });
        return;
      }

      const fallbackCountry = findCountryDialCodeOption(nextCountryIso2);
      onChange({
        countryIso2: nextCountryIso2,
        dialCode: fallbackCountry?.dialCode ?? "",
        nationalNumber: normalizeNationalNumberInput(nextNationalNumber),
        e164:
          nextNationalNumber.trim().length > 0
            ? `${fallbackCountry?.dialCode ?? ""}${normalizeNationalNumberInput(nextNationalNumber)}`
            : "",
        isValid: false,
        message: normalized.message,
      });
    },
    [onChange],
  );

  const handlePickContact = async () => {
    if (!isSupported || disabled || isPicking) {
      return;
    }

    setIsPicking(true);
    try {
      const picked = await pickSinglePhoneContact();
      if (!picked?.phoneNumbers[0]) {
        return;
      }

      const parsed = parseStoredPhoneValue(
        picked.phoneNumbers[0],
        selectedCountry.iso2,
      );

      emitNextValue(parsed.countryIso2, parsed.nationalNumber);
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-stretch gap-2" dir="ltr">
        <CountryDialCodePicker
          value={selectedCountry.iso2}
          onChange={(country) =>
            emitNextValue(country.iso2, resolvedNationalNumber)
          }
          disabled={disabled}
        />

        <Input
          type="tel"
          value={resolvedNationalNumber}
          onChange={(event) =>
            emitNextValue(
              selectedCountry.iso2,
              normalizeNationalNumberInput(event.target.value),
            )
          }
          onPaste={(event) => {
            const pastedText = event.clipboardData.getData("text");
            if (!pastedText.trim().startsWith("+")) {
              return;
            }

            event.preventDefault();
            const parsed = parseStoredPhoneValue(pastedText, selectedCountry.iso2);
            emitNextValue(parsed.countryIso2, parsed.nationalNumber);
          }}
          placeholder={placeholder}
          autoComplete="tel-national"
          inputMode="tel"
          required={required}
          disabled={disabled}
          icon={<Phone className="h-4 w-4" />}
          className={cn("h-11 rounded-2xl", inputClassName)}
          dir="ltr"
        />

        {isSupported ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void handlePickContact()}
            disabled={disabled || isPicking}
            className="h-11 w-11 shrink-0 rounded-2xl border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
            data-testid={buttonTestId}
            title="اختيار رقم من الجهاز"
          >
            <ContactRound className={cn("h-4 w-4", isPicking && "animate-pulse")} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
