import type { LookupCatalogType } from "@/lib/api/client";

export type LookupCatalogFieldType = "text" | "number" | "checkbox" | "select" | "color";

export type LookupCatalogField = {
  key:
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

export function getLookupCatalogDefinition(type: string) {
  if (type in LOOKUP_CATALOG_DEFINITIONS) {
    return LOOKUP_CATALOG_DEFINITIONS[type as LookupCatalogType];
  }

  return null;
}
