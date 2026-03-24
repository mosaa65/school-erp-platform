export type StudentPickerVariant = "filter" | "form" | "narrow";

export type StudentPickerDefaults = {
  placeholder: string;
  title: string;
  searchPlaceholder: string;
  emptySelectionLabel: string;
  allowEmptySelection: boolean;
  storageKey: string;
};

export function resolveStudentPickerDefaults({
  scope,
  variant,
}: {
  scope: string;
  variant: StudentPickerVariant;
}): StudentPickerDefaults {
  switch (variant) {
    case "filter":
      return {
        placeholder: "كل الطلاب",
        title: "اختيار الطالب للتصفية",
        searchPlaceholder: "ابحث بالاسم أو رقم الطالب",
        emptySelectionLabel: "كل الطلاب",
        allowEmptySelection: true,
        storageKey: `student-picker:${scope}:filter`,
      };
    case "narrow":
      return {
        placeholder: "اختر الطالب لتصفية القيود",
        title: "اختيار الطالب",
        searchPlaceholder: "ابحث بالاسم أو رقم الطالب",
        emptySelectionLabel: "كل الطلاب داخل النموذج",
        allowEmptySelection: true,
        storageKey: `student-picker:${scope}:narrow`,
      };
    case "form":
    default:
      return {
        placeholder: "اختر الطالب",
        title: "اختيار الطالب",
        searchPlaceholder: "ابحث بالاسم أو رقم الطالب",
        emptySelectionLabel: "مسح اختيار الطالب",
        allowEmptySelection: true,
        storageKey: `student-picker:${scope}:form`,
      };
  }
}
