import {
  Activity,
  BadgeCheck,
  BriefcaseBusiness,
  Brain,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  Droplets,
  GraduationCap,
  Handshake,
  HeartHandshake,
  HeartPulse,
  House,
  IdCard,
  Landmark,
  MapPin,
  MapPinHouse,
  MapPinned,
  MoonStar,
  School,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { LookupCatalogType } from "@/lib/api/client";

export type LookupCatalogVisual = {
  icon: LucideIcon;
  iconClassName: string;
  iconSurfaceClassName: string;
  cardClassName: string;
  keywords: string[];
};

const LOOKUP_ACCENTS = {
  rose: {
    iconClassName: "text-rose-700 dark:text-rose-300",
    iconSurfaceClassName: "border-rose-500/20 bg-rose-500/10",
    cardClassName: "hover:border-rose-500/30 hover:bg-rose-500/5",
  },
  sky: {
    iconClassName: "text-sky-700 dark:text-sky-300",
    iconSurfaceClassName: "border-sky-500/20 bg-sky-500/10",
    cardClassName: "hover:border-sky-500/30 hover:bg-sky-500/5",
  },
  emerald: {
    iconClassName: "text-emerald-700 dark:text-emerald-300",
    iconSurfaceClassName: "border-emerald-500/20 bg-emerald-500/10",
    cardClassName: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
  },
  amber: {
    iconClassName: "text-amber-700 dark:text-amber-300",
    iconSurfaceClassName: "border-amber-500/20 bg-amber-500/10",
    cardClassName: "hover:border-amber-500/30 hover:bg-amber-500/5",
  },
  orange: {
    iconClassName: "text-orange-700 dark:text-orange-300",
    iconSurfaceClassName: "border-orange-500/20 bg-orange-500/10",
    cardClassName: "hover:border-orange-500/30 hover:bg-orange-500/5",
  },
  violet: {
    iconClassName: "text-violet-700 dark:text-violet-300",
    iconSurfaceClassName: "border-violet-500/20 bg-violet-500/10",
    cardClassName: "hover:border-violet-500/30 hover:bg-violet-500/5",
  },
  fuchsia: {
    iconClassName: "text-fuchsia-700 dark:text-fuchsia-300",
    iconSurfaceClassName: "border-fuchsia-500/20 bg-fuchsia-500/10",
    cardClassName: "hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5",
  },
  slate: {
    iconClassName: "text-slate-700 dark:text-slate-300",
    iconSurfaceClassName: "border-slate-500/20 bg-slate-500/10",
    cardClassName: "hover:border-slate-500/30 hover:bg-slate-500/5",
  },
  indigo: {
    iconClassName: "text-indigo-700 dark:text-indigo-300",
    iconSurfaceClassName: "border-indigo-500/20 bg-indigo-500/10",
    cardClassName: "hover:border-indigo-500/30 hover:bg-indigo-500/5",
  },
  cyan: {
    iconClassName: "text-cyan-700 dark:text-cyan-300",
    iconSurfaceClassName: "border-cyan-500/20 bg-cyan-500/10",
    cardClassName: "hover:border-cyan-500/30 hover:bg-cyan-500/5",
  },
} as const;

function withAccent(
  icon: LucideIcon,
  accent: keyof typeof LOOKUP_ACCENTS,
  keywords: string[],
): LookupCatalogVisual {
  return {
    icon,
    keywords,
    ...LOOKUP_ACCENTS[accent],
  };
}

export const LOOKUP_CATALOG_VISUALS: Record<LookupCatalogType, LookupCatalogVisual> = {
  "blood-types": withAccent(Droplets, "rose", ["دم", "فصيلة", "صحي"]),
  "id-types": withAccent(IdCard, "sky", ["هوية", "وثائق", "بطاقة"]),
  "ownership-types": withAccent(Building2, "amber", ["ملكية", "مدرسة", "مبنى"]),
  periods: withAccent(Clock3, "cyan", ["دوام", "صباحي", "مسائي"]),
  "school-types": withAccent(School, "orange", ["مدرسة", "نوع", "تعليمي"]),
  genders: withAccent(UsersRound, "fuchsia", ["جنس", "ذكر", "أنثى"]),
  qualifications: withAccent(GraduationCap, "indigo", ["مؤهل", "علمي", "شهادة"]),
  "job-roles": withAccent(BriefcaseBusiness, "amber", ["وظيفة", "مسمى", "دور"]),
  days: withAccent(CalendarDays, "cyan", ["أيام", "أسبوع", "دوام"]),
  "attendance-statuses": withAccent(ClipboardCheck, "emerald", ["حضور", "غياب", "انضباط"]),
  "marital-statuses": withAccent(HeartHandshake, "rose", ["اجتماعية", "زواج", "أسرة"]),
  "health-statuses": withAccent(HeartPulse, "rose", ["صحية", "مرض", "سلامة"]),
  "enrollment-statuses": withAccent(BadgeCheck, "emerald", ["قيد", "تسجيل", "طالب"]),
  "orphan-statuses": withAccent(HeartHandshake, "violet", ["يتم", "اجتماعي", "طالب"]),
  "ability-levels": withAccent(Brain, "sky", ["قدرات", "مستوى", "مهارات"]),
  "activity-types": withAccent(Activity, "orange", ["نشاط", "فعاليات", "تفاعل"]),
  "relationship-types": withAccent(Handshake, "cyan", ["صلة", "قرابة", "علاقة"]),
  talents: withAccent(Sparkles, "violet", ["موهبة", "إبداع", "تميّز"]),
  "hijri-months": withAccent(MoonStar, "indigo", ["هجري", "أشهر", "تقويم"]),
  weeks: withAccent(CalendarRange, "sky", ["أسابيع", "تقويم", "فترة"]),
  buildings: withAccent(Building2, "slate", ["مبنى", "مرافق", "مدرسة"]),
  governorates: withAccent(Landmark, "amber", ["محافظة", "إداري", "منطقة"]),
  directorates: withAccent(MapPinned, "emerald", ["مديرية", "إداري", "منطقة"]),
  "sub-districts": withAccent(MapPin, "cyan", ["عزلة", "تقسيم", "جغرافي"]),
  villages: withAccent(House, "orange", ["قرية", "سكن", "منطقة"]),
  localities: withAccent(MapPinHouse, "violet", ["محلة", "سكن", "جغرافي"]),
};

export function getLookupCatalogVisual(type: LookupCatalogType): LookupCatalogVisual {
  return LOOKUP_CATALOG_VISUALS[type];
}
