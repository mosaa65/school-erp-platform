export type GuardianPickerVariant = "filter" | "form";

export type GuardianPickerDefaults = {
  placeholder: string;
  title: string;
  searchPlaceholder: string;
  emptySelectionLabel: string;
  allowEmptySelection: boolean;
  storageKey: string;
};

export function resolveGuardianPickerDefaults({
  scope,
  variant,
}: {
  scope: string;
  variant: GuardianPickerVariant;
}): GuardianPickerDefaults {
  switch (variant) {
    case "filter":
      return {
        placeholder: "كل أولياء الأمور",
        title: "اختيار ولي الأمر للتصفية",
        searchPlaceholder: "ابحث باسم ولي الأمر أو الهاتف",
        emptySelectionLabel: "كل أولياء الأمور",
        allowEmptySelection: true,
        storageKey: `guardian-picker:${scope}:filter`,
      };
    case "form":
    default:
      return {
        placeholder: "اختر ولي الأمر",
        title: "اختيار ولي الأمر",
        searchPlaceholder: "ابحث باسم ولي الأمر أو الهاتف",
        emptySelectionLabel: "مسح اختيار ولي الأمر",
        allowEmptySelection: true,
        storageKey: `guardian-picker:${scope}:form`,
      };
  }
}
