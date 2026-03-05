import type { LookupCatalogType } from "@/lib/api/client";

export type LookupCatalogFieldType = "text" | "number" | "checkbox" | "select" | "color";

export type LookupCatalogField = {
  key:
    | "name"
    | "code"
    | "nameAr"
    | "nameEn"
    | "sortOrder"
    | "nameArFemale"
    | "orderNum"
    | "isWorkingDay"
    | "governorateId"
    | "directorateId"
    | "subDistrictId"
    | "villageId"
    | "appliesTo"
    | "colorCode"
    | "requiresDetails"
    | "gender"
    | "localityType"
    | "category";
  label: string;
  type: LookupCatalogFieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

export type LookupCatalogDefinition = {
  type: LookupCatalogType;
  title: string;
  description: string;
  readPermission: string;
  createPermission: string;
  updatePermission: string;
  deletePermission: string;
  fields: LookupCatalogField[];
};

const APPLIES_TO_OPTIONS = [
  { value: "ALL", label: "الكل" },
  { value: "STUDENTS", label: "طلاب" },
  { value: "EMPLOYEES", label: "موظفون" },
];

const RELATIONSHIP_GENDER_OPTIONS = [
  { value: "ALL", label: "الكل" },
  { value: "MALE", label: "ذكر" },
  { value: "FEMALE", label: "أنثى" },
];

const LOCALITY_TYPE_OPTIONS = [
  { value: "RURAL", label: "ريف" },
  { value: "URBAN", label: "حضر" },
];

export const LOOKUP_CATALOG_DEFINITIONS: Record<LookupCatalogType, LookupCatalogDefinition> = {
  "blood-types": {
    type: "blood-types",
    title: "فصائل الدم",
    description: "مرجعية فصائل الدم المستخدمة في بيانات الطلاب.",
    readPermission: "lookup-blood-types.read",
    createPermission: "lookup-blood-types.create",
    updatePermission: "lookup-blood-types.update",
    deletePermission: "lookup-blood-types.delete",
    fields: [{ key: "name", label: "اسم الفصيلة", type: "text", required: true, placeholder: "A+" }],
  },
  "id-types": {
    type: "id-types",
    title: "أنواع الهوية",
    description: "مرجعية أنواع الوثائق والهوية.",
    readPermission: "lookup-id-types.read",
    createPermission: "lookup-id-types.create",
    updatePermission: "lookup-id-types.update",
    deletePermission: "lookup-id-types.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "NATIONAL_ID" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "بطاقة شخصية" },
    ],
  },
  "ownership-types": {
    type: "ownership-types",
    title: "أنواع الملكية",
    description: "مرجعية نوع ملكية المدرسة.",
    readPermission: "lookup-ownership-types.read",
    createPermission: "lookup-ownership-types.create",
    updatePermission: "lookup-ownership-types.update",
    deletePermission: "lookup-ownership-types.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "PRIVATE" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "خاصة" },
    ],
  },
  periods: {
    type: "periods",
    title: "فترات الدوام",
    description: "مرجعية فترات الدوام المدرسي.",
    readPermission: "lookup-periods.read",
    createPermission: "lookup-periods.create",
    updatePermission: "lookup-periods.update",
    deletePermission: "lookup-periods.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "MORNING" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "صباحية" },
    ],
  },
  "school-types": {
    type: "school-types",
    title: "أنواع المدارس",
    description: "تعريف أنواع المدارس المعتمدة في ملف المدرسة.",
    readPermission: "lookup-school-types.read",
    createPermission: "lookup-school-types.create",
    updatePermission: "lookup-school-types.update",
    deletePermission: "lookup-school-types.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "PRIMARY" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "أساسية" },
      { key: "nameEn", label: "الاسم بالإنجليزية", type: "text", placeholder: "Primary" },
    ],
  },
  genders: {
    type: "genders",
    title: "أنواع الجنس",
    description: "القيم المرجعية للجنس في النظام.",
    readPermission: "lookup-genders.read",
    createPermission: "lookup-genders.create",
    updatePermission: "lookup-genders.update",
    deletePermission: "lookup-genders.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "MALE" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "ذكر" },
      { key: "nameEn", label: "الاسم بالإنجليزية", type: "text", placeholder: "Male" },
    ],
  },
  qualifications: {
    type: "qualifications",
    title: "المؤهلات العلمية",
    description: "قائمة المؤهلات المرجعية للموظفين.",
    readPermission: "lookup-qualifications.read",
    createPermission: "lookup-qualifications.create",
    updatePermission: "lookup-qualifications.update",
    deletePermission: "lookup-qualifications.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "BACHELOR" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "جامعي" },
      { key: "sortOrder", label: "ترتيب العرض", type: "number", required: true, placeholder: "6" },
    ],
  },
  "job-roles": {
    type: "job-roles",
    title: "الأدوار الوظيفية",
    description: "المسميات الوظيفية المعتمدة داخل المدرسة.",
    readPermission: "lookup-job-roles.read",
    createPermission: "lookup-job-roles.create",
    updatePermission: "lookup-job-roles.update",
    deletePermission: "lookup-job-roles.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "TEACHER" },
      { key: "nameAr", label: "الاسم (مذكر)", type: "text", required: true, placeholder: "معلم" },
      { key: "nameArFemale", label: "الاسم (مؤنث)", type: "text", placeholder: "معلمة" },
    ],
  },
  days: {
    type: "days",
    title: "أيام الأسبوع",
    description: "تكوين أيام العمل للدوام.",
    readPermission: "lookup-days.read",
    createPermission: "lookup-days.create",
    updatePermission: "lookup-days.update",
    deletePermission: "lookup-days.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "SATURDAY" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "السبت" },
      { key: "nameEn", label: "الاسم بالإنجليزية", type: "text", placeholder: "Saturday" },
      { key: "orderNum", label: "الترتيب", type: "number", required: true, placeholder: "1" },
      { key: "isWorkingDay", label: "يوم عمل", type: "checkbox" },
    ],
  },
  "attendance-statuses": {
    type: "attendance-statuses",
    title: "حالات الحضور",
    description: "تعريف حالات الحضور والغياب للطلاب والموظفين.",
    readPermission: "lookup-attendance-statuses.read",
    createPermission: "lookup-attendance-statuses.create",
    updatePermission: "lookup-attendance-statuses.update",
    deletePermission: "lookup-attendance-statuses.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "PRESENT" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "حاضر" },
      {
        key: "appliesTo",
        label: "ينطبق على",
        type: "select",
        required: true,
        options: APPLIES_TO_OPTIONS,
      },
      { key: "colorCode", label: "لون العرض", type: "color", placeholder: "#28A745" },
    ],
  },
  "marital-statuses": {
    type: "marital-statuses",
    title: "الحالات الاجتماعية",
    description: "مرجعية الحالات الاجتماعية.",
    readPermission: "lookup-marital-statuses.read",
    createPermission: "lookup-marital-statuses.create",
    updatePermission: "lookup-marital-statuses.update",
    deletePermission: "lookup-marital-statuses.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "MARRIED" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "متزوج" },
    ],
  },
  "health-statuses": {
    type: "health-statuses",
    title: "الحالات الصحية",
    description: "مرجعية الحالات الصحية.",
    readPermission: "lookup-health-statuses.read",
    createPermission: "lookup-health-statuses.create",
    updatePermission: "lookup-health-statuses.update",
    deletePermission: "lookup-health-statuses.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "HEALTHY" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "سليم" },
      { key: "requiresDetails", label: "يتطلب تفاصيل", type: "checkbox" },
    ],
  },
  "enrollment-statuses": {
    type: "enrollment-statuses",
    title: "حالات القيد",
    description: "مرجعية حالات قيد الطالب في المدرسة.",
    readPermission: "lookup-enrollment-statuses.read",
    createPermission: "lookup-enrollment-statuses.create",
    updatePermission: "lookup-enrollment-statuses.update",
    deletePermission: "lookup-enrollment-statuses.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "ACTIVE" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "منتظم" },
    ],
  },
  "orphan-statuses": {
    type: "orphan-statuses",
    title: "حالات اليتم",
    description: "مرجعية حالة يتم الطالب.",
    readPermission: "lookup-orphan-statuses.read",
    createPermission: "lookup-orphan-statuses.create",
    updatePermission: "lookup-orphan-statuses.update",
    deletePermission: "lookup-orphan-statuses.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "NONE" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "غير يتيم" },
    ],
  },
  "ability-levels": {
    type: "ability-levels",
    title: "مستويات القدرة",
    description: "مرجعية مستويات القدرات الدراسية والسلوكية.",
    readPermission: "lookup-ability-levels.read",
    createPermission: "lookup-ability-levels.create",
    updatePermission: "lookup-ability-levels.update",
    deletePermission: "lookup-ability-levels.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "EXCELLENT" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "ممتاز" },
    ],
  },
  "activity-types": {
    type: "activity-types",
    title: "أنواع الأنشطة",
    description: "مرجعية الأنشطة الطلابية.",
    readPermission: "lookup-activity-types.read",
    createPermission: "lookup-activity-types.create",
    updatePermission: "lookup-activity-types.update",
    deletePermission: "lookup-activity-types.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "SPORTS" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "رياضي" },
    ],
  },
  "relationship-types": {
    type: "relationship-types",
    title: "أنواع العلاقات",
    description: "مرجعية صلة القرابة.",
    readPermission: "lookup-relationship-types.read",
    createPermission: "lookup-relationship-types.create",
    updatePermission: "lookup-relationship-types.update",
    deletePermission: "lookup-relationship-types.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "FATHER" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "أب" },
      {
        key: "gender",
        label: "الجنس",
        type: "select",
        options: RELATIONSHIP_GENDER_OPTIONS,
      },
    ],
  },
  talents: {
    type: "talents",
    title: "المواهب (مرجعية)",
    description: "مرجعية المواهب العامة عبر الأنظمة.",
    readPermission: "lookup-talents.read",
    createPermission: "lookup-talents.create",
    updatePermission: "lookup-talents.update",
    deletePermission: "lookup-talents.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "SPORTS" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "رياضة" },
      { key: "category", label: "التصنيف", type: "text", placeholder: "بدنية" },
      {
        key: "appliesTo",
        label: "ينطبق على",
        type: "select",
        options: APPLIES_TO_OPTIONS,
      },
    ],
  },
  "hijri-months": {
    type: "hijri-months",
    title: "الأشهر الهجرية",
    description: "مرجعية الأشهر الهجرية المستخدمة في التقويم.",
    readPermission: "lookup-hijri-months.read",
    createPermission: "lookup-hijri-months.create",
    updatePermission: "lookup-hijri-months.update",
    deletePermission: "lookup-hijri-months.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "MUHARRAM" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "محرم" },
      { key: "nameEn", label: "الاسم بالإنجليزية", type: "text", placeholder: "Muharram" },
      { key: "orderNum", label: "الترتيب", type: "number", required: true, placeholder: "1" },
    ],
  },
  weeks: {
    type: "weeks",
    title: "الأسابيع",
    description: "مرجعية أسابيع الشهر.",
    readPermission: "lookup-weeks.read",
    createPermission: "lookup-weeks.create",
    updatePermission: "lookup-weeks.update",
    deletePermission: "lookup-weeks.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "WEEK_1" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "الأول" },
      { key: "orderNum", label: "الترتيب", type: "number", required: true, placeholder: "1" },
    ],
  },
  buildings: {
    type: "buildings",
    title: "المباني المدرسية",
    description: "مرجعية المباني في المدرسة.",
    readPermission: "lookup-buildings.read",
    createPermission: "lookup-buildings.create",
    updatePermission: "lookup-buildings.update",
    deletePermission: "lookup-buildings.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", required: true, placeholder: "NEW_BUILDING" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "المدرسة الجديدة" },
    ],
  },
  governorates: {
    type: "governorates",
    title: "المحافظات",
    description: "القاموس الجغرافي للمحافظات.",
    readPermission: "governorates.read",
    createPermission: "governorates.create",
    updatePermission: "governorates.update",
    deletePermission: "governorates.delete",
    fields: [
      { key: "code", label: "الكود", type: "text", placeholder: "IBB" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "إب" },
      { key: "nameEn", label: "الاسم بالإنجليزية", type: "text", placeholder: "Ibb" },
    ],
  },
  directorates: {
    type: "directorates",
    title: "المديريات",
    description: "القاموس الجغرافي للمديريات.",
    readPermission: "directorates.read",
    createPermission: "directorates.create",
    updatePermission: "directorates.update",
    deletePermission: "directorates.delete",
    fields: [
      { key: "governorateId", label: "معرف المحافظة", type: "number", required: true, placeholder: "1" },
      { key: "code", label: "الكود", type: "text", placeholder: "ALUDAYN" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "العدين" },
    ],
  },
  "sub-districts": {
    type: "sub-districts",
    title: "العزل",
    description: "القاموس الجغرافي للعزل.",
    readPermission: "sub-districts.read",
    createPermission: "sub-districts.create",
    updatePermission: "sub-districts.update",
    deletePermission: "sub-districts.delete",
    fields: [
      { key: "directorateId", label: "معرف المديرية", type: "number", required: true, placeholder: "1" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "بني عواض" },
    ],
  },
  villages: {
    type: "villages",
    title: "القرى",
    description: "القاموس الجغرافي للقرى.",
    readPermission: "villages.read",
    createPermission: "villages.create",
    updatePermission: "villages.update",
    deletePermission: "villages.delete",
    fields: [
      { key: "subDistrictId", label: "معرف العزلة", type: "number", required: true, placeholder: "1" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "النخلة" },
    ],
  },
  localities: {
    type: "localities",
    title: "المحلات/الأحياء",
    description: "القاموس الجغرافي للمحلات والأحياء.",
    readPermission: "localities.read",
    createPermission: "localities.create",
    updatePermission: "localities.update",
    deletePermission: "localities.delete",
    fields: [
      { key: "villageId", label: "معرف القرية", type: "number", placeholder: "1" },
      { key: "directorateId", label: "معرف المديرية (للحضر)", type: "number", placeholder: "1" },
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, placeholder: "الحي المركزي" },
      {
        key: "localityType",
        label: "نوع المحلة",
        type: "select",
        required: true,
        options: LOCALITY_TYPE_OPTIONS,
      },
    ],
  },
};

export const LOOKUP_CATALOG_LIST = Object.values(LOOKUP_CATALOG_DEFINITIONS);

export type LookupCatalogGroup = {
  id: "system-01" | "system-04";
  label: string;
  description: string;
  types: LookupCatalogType[];
};

export const LOOKUP_CATALOG_GROUPS: LookupCatalogGroup[] = [
  {
    id: "system-01",
    label: "النظام 01 - البنية المشتركة",
    description: "مرجعيات المؤسسة الأساسية المشتركة بين جميع الأنظمة.",
    types: [
      "blood-types",
      "id-types",
      "ownership-types",
      "periods",
      "school-types",
      "genders",
      "qualifications",
      "job-roles",
      "days",
      "attendance-statuses",
      "marital-statuses",
      "health-statuses",
      "relationship-types",
      "talents",
      "hijri-months",
      "weeks",
      "buildings",
      "governorates",
      "directorates",
      "sub-districts",
      "villages",
      "localities",
    ],
  },
  {
    id: "system-04",
    label: "النظام 04 - الطلاب",
    description: "مرجعيات مرتبطة مباشرة بتشغيل بيانات الطلاب.",
    types: ["enrollment-statuses", "orphan-statuses", "ability-levels", "activity-types"],
  },
];

export function getLookupCatalogGroupByType(type: LookupCatalogType): LookupCatalogGroup {
  return LOOKUP_CATALOG_GROUPS.find((group) => group.types.includes(type)) ?? LOOKUP_CATALOG_GROUPS[0];
}

export function getLookupCatalogDefinition(type: string) {
  if (type in LOOKUP_CATALOG_DEFINITIONS) {
    return LOOKUP_CATALOG_DEFINITIONS[type as LookupCatalogType];
  }

  return null;
}
