export type StudentEnrollmentPickerVariant = "filter" | "form";

export type StudentEnrollmentPickerDefaults = {
  placeholder: string;
  title: string;
  searchPlaceholder: string;
  emptySelectionLabel: string;
  allowEmptySelection: boolean;
  storageKey: string;
};

export function resolveStudentEnrollmentPickerDefaults({
  scope,
  variant,
}: {
  scope: string;
  variant: StudentEnrollmentPickerVariant;
}): StudentEnrollmentPickerDefaults {
  switch (variant) {
    case "filter":
      return {
        placeholder: "كل القيود الطلابية",
        title: "اختيار القيد للتصفية",
        searchPlaceholder: "ابحث بالاسم أو رقم الطالب أو رقم القيد",
        emptySelectionLabel: "كل القيود الطلابية",
        allowEmptySelection: true,
        storageKey: `student-enrollment-picker:${scope}:filter`,
      };
    case "form":
    default:
      return {
        placeholder: "اختر القيد الطلابي",
        title: "اختيار القيد الطلابي",
        searchPlaceholder: "ابحث بالاسم أو رقم الطالب أو رقم القيد",
        emptySelectionLabel: "مسح اختيار القيد",
        allowEmptySelection: true,
        storageKey: `student-enrollment-picker:${scope}:form`,
      };
  }
}
