import * as React from "react";

export type DiscountRuleItem = {
  id: string;
  name: string;
  category: string;
  coverage: string;
  valueLabel: string;
  eligibility: string;
  status: "active" | "scheduled" | "inactive";
};

const DISCOUNT_RULES: DiscountRuleItem[] = [
  {
    id: "dr-sibling-10",
    name: "خصم الأشقاء 10%",
    category: "أشقاء",
    coverage: "حتى 3 طلاب",
    valueLabel: "خصم 10% على الرسوم الأساسية",
    eligibility: "أسرة مرتبطة برقم ولي الأمر",
    status: "active",
  },
  {
    id: "dr-early-5",
    name: "سداد مبكر 5%",
    category: "تحفيزي",
    coverage: "دفعة فصلية",
    valueLabel: "خصم 5% قبل بداية الفصل",
    eligibility: "فواتير قبل 15 يومًا من الاستحقاق",
    status: "scheduled",
  },
  {
    id: "dr-scholarship-20",
    name: "منحة تفوق 20%",
    category: "منح",
    coverage: "طالب واحد",
    valueLabel: "خصم 20% طوال العام",
    eligibility: "نتيجة سنوية أعلى من 95%",
    status: "active",
  },
  {
    id: "dr-staff-15",
    name: "خصم أبناء الموظفين 15%",
    category: "موظفون",
    coverage: "حتى 2 طلاب",
    valueLabel: "خصم 15% على الرسوم الأساسية",
    eligibility: "موظف نشط في النظام",
    status: "inactive",
  },
];

export function useDiscountRulesOverview() {
  const rules = React.useMemo(() => DISCOUNT_RULES, []);
  const summary = React.useMemo(() => {
    const activeCount = rules.filter((rule) => rule.status === "active").length;
    const scheduledCount = rules.filter((rule) => rule.status === "scheduled").length;
    const inactiveCount = rules.filter((rule) => rule.status === "inactive").length;

    return {
      totalCount: rules.length,
      activeCount,
      scheduledCount,
      inactiveCount,
    };
  }, [rules]);

  return {
    rules,
    summary,
    ownerNote: "تجميع الخصومات حسب السياسات المعتمدة حاليًا.",
  };
}
