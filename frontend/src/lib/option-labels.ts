export function formatNameCodeLabel(
  name?: string | null,
  code?: string | null,
): string {
  const normalizedName = name?.trim() ?? "";
  const normalizedCode = code?.trim() ?? "";

  if (normalizedName && normalizedCode) {
    if (normalizedName === normalizedCode) {
      return normalizedName;
    }

    return `${normalizedName} (${normalizedCode})`;
  }

  return normalizedName || normalizedCode || "-";
}

type GradeLevelLabelInput = {
  name?: string | null;
  code?: string | null;
};

type SectionLabelInput = {
  name?: string | null;
  code?: string | null;
  gradeLevel?: GradeLevelLabelInput | null;
};

export function formatSectionWithGradeLabel(
  section: SectionLabelInput,
): string {
  const sectionLabel = formatNameCodeLabel(section.name, section.code);
  const gradeLabel = section.gradeLevel
    ? formatNameCodeLabel(section.gradeLevel.name, section.gradeLevel.code)
    : "";

  if (!gradeLabel) {
    return sectionLabel;
  }

  return `${gradeLabel} / ${sectionLabel}`;
}
