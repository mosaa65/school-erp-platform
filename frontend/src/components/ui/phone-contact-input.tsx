"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  pickSinglePhoneContact,
  supportsContactPicker,
  type PickedPhoneContact,
} from "@/lib/phone-contact-picker";

type PhoneContactInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
  helpText?: string;
  actionLabel?: string;
  buttonTestId?: string;
};

export function PhoneContactInput({
  value,
  onValueChange,
  containerClassName,
  helpText,
  actionLabel = "اختيار من النظام",
  disabled = false,
  className,
  buttonTestId,
  ...inputProps
}: PhoneContactInputProps) {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isPicking, setIsPicking] = React.useState(false);
  const [pendingContact, setPendingContact] = React.useState<PickedPhoneContact | null>(null);

  React.useEffect(() => {
    setIsSupported(supportsContactPicker());
  }, []);

  const resolvedHelpText = helpText ?? "يمكنك إدخال الرقم يدويًا أو اختيار جهة اتصال من جهازك (إن كان مدعوماً).";

  const handleChooseContact = async () => {
    if (!isSupported) {
      alert("عذراً، متصفحك أو جهازك لا يدعم ميزة استيراد جهات الاتصال بشكل مباشر. يرجى إدخال الرقم يدوياً.");
      return;
    }
    
    if (disabled || isPicking) {
      return;
    }

    setPendingContact(null);
    setIsPicking(true);

    try {
      const selectedContact = await pickSinglePhoneContact();
      if (!selectedContact) {
        return;
      }

      if (selectedContact.phoneNumbers.length === 1) {
        onValueChange(selectedContact.phoneNumbers[0]);
        return;
      }

      setPendingContact(selectedContact);
    } catch {
      // The native contact picker can be cancelled or rejected.
    } finally {
      setIsPicking(false);
    }
  };

  const handleSelectPhoneNumber = (phoneNumber: string) => {
    onValueChange(phoneNumber);
    setPendingContact(null);
  };

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className="flex flex-wrap items-stretch gap-2">
        <Input
          {...inputProps}
          type="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          className={cn("flex-1", className)}
        />

        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => void handleChooseContact()}
          disabled={disabled || isPicking}
          data-testid={buttonTestId}
          title={actionLabel}
          className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 border border-primary/20 shadow-sm"
        >
          <UserPlus className={cn("h-4 w-4", isPicking && "animate-pulse")} />
        </Button>
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">{resolvedHelpText}</p>

      {pendingContact ? (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">
                اختر رقمًا لجهة الاتصال: {pendingContact.contactName}
              </p>
              <p className="text-xs text-muted-foreground">
                يوجد {pendingContact.phoneNumbers.length} رقم مسجل
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPendingContact(null)}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
              إلغاء
            </Button>
          </div>

          <div className="space-y-2">
            {pendingContact.phoneNumbers.map((phoneNumber, index) => (
              <button
                key={`${phoneNumber}-${index}`}
                type="button"
                onClick={() => handleSelectPhoneNumber(phoneNumber)}
                className={cn(
                  "w-full rounded-xl border border-border/70 bg-background/90 px-4 py-3 text-right text-sm transition",
                  "hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{phoneNumber}</span>
                  <span className="text-xs text-muted-foreground">اختيار</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
