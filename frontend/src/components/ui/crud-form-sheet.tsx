"use client";

import * as React from "react";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";

type CrudFormSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  isSubmitting?: boolean;
  description?: string;
  eyebrow?: string;
  showCancelButton?: boolean;
  showFooter?: boolean;
};

export function CrudFormSheet({
  open,
  title,
  onClose,
  onSubmit,
  children,
  submitLabel,
  isSubmitting = false,
  description,
  eyebrow,
  showCancelButton = false,
  showFooter = false,
}: CrudFormSheetProps) {
  return (
    <BottomSheetForm
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
      description={description}
      eyebrow={eyebrow}
      showCancelButton={showCancelButton}
      showFooter={showFooter}
    >
      {children}
    </BottomSheetForm>
  );
}
