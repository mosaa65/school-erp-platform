"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellRing,
  BookOpenText,
  ClipboardList,
  Medal,
  LockKeyhole,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TextareaField } from "@/components/ui/textarea-field";
import { useHomeworkTypeOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-type-options-query";
import { useHomeworkTemplateOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-template-options-query";
import {
  useCreateHomeworkTemplateMutation,
  useDeleteHomeworkTemplateMutation,
} from "@/features/assignments/homeworks/hooks/use-homework-templates-mutations";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { formatNameCodeLabel } from "@/lib/option-labels";

export function HomeworkSettingsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreateTemplate = hasPermission("homework-templates.create");
  const canDeleteTemplate = hasPermission("homework-templates.delete");
  const [templateForm, setTemplateForm] = React.useState({
    code: "",
    name: "",
    title: "",
    content: "",
    maxScore: "10",
    notes: "",
  });
  const homeworkTypesQuery = useHomeworkTypeOptionsQuery();
  const homeworkTemplatesQuery = useHomeworkTemplateOptionsQuery();
  const createTemplateMutation = useCreateHomeworkTemplateMutation();
  const deleteTemplateMutation = useDeleteHomeworkTemplateMutation();
  const homeworkTypes = homeworkTypesQuery.data ?? [];
  const homeworkTemplates = homeworkTemplatesQuery.data ?? [];

  function resetTemplateForm() {
    setTemplateForm({
      code: "",
      name: "",
      title: "",
      content: "",
      maxScore: "10",
      notes: "",
    });
  }

  function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateTemplate || !templateForm.name.trim() || !templateForm.title.trim()) {
      return;
    }

    createTemplateMutation.mutate(
      {
        code: templateForm.code.trim() || undefined,
        name: templateForm.name.trim(),
        title: templateForm.title.trim(),
        content: templateForm.content.trim() || undefined,
        maxScore: Number(templateForm.maxScore || 10),
        notes: templateForm.notes.trim() || undefined,
        isActive: true,
      },
      {
        onSuccess: resetTemplateForm,
      },
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
              <Settings2 className="h-3.5 w-3.5" />
              إعدادات التشغيل
            </div>
            <h1 className="text-2xl font-bold tracking-normal">إعدادات نظام الواجبات</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              مركز واحد لضبط أنواع الواجبات، سياسات التشغيل، التنبيهات، والقفل
              المستقبلي للواجبات المعتمدة.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/homework-types">
              <BookOpenText />
              إدارة الأنواع
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/homework-rubrics">
              <Medal />
              معايير التصحيح
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">أنواع الواجبات النشطة</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  تستخدم في إنشاء الواجبات والتقارير.
                </p>
              </div>
              <Badge variant="outline">{homeworkTypes.length}</Badge>
            </div>
            <div className="grid gap-2">
              {homeworkTypes.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  لا توجد أنواع واجبات متاحة.
                </div>
              ) : (
                homeworkTypes.slice(0, 8).map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/15 p-3"
                  >
                    <span className="font-medium">
                      {formatNameCodeLabel(type.name, type.code)}
                    </span>
                    <Badge variant={type.isActive ? "outline" : "secondary"}>
                      {type.isActive ? "نشط" : "موقوف"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">سياسات النظام القادمة</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                تم تجهيز الصفحة لتكون مركز السياسات عند إضافة الجداول الخاصة بها.
              </p>
            </div>
            <SettingPreview
              icon={<SlidersHorizontal />}
              title="الدرجة الافتراضية"
              description="تحديد درجة افتراضية حسب نوع الواجب أو المادة."
            />
            <SettingPreview
              icon={<BellRing />}
              title="تنبيهات المتأخرين"
              description="إرسال تنبيه عند اقتراب موعد التسليم أو تجاوزه."
            />
            <SettingPreview
              icon={<LockKeyhole />}
              title="القفل والاعتماد"
              description="منع التعديل بعد دخول الواجب في المحصلة الشهرية."
            />
            <SettingPreview
              icon={<ClipboardList />}
              title="قوالب الواجبات"
              description="تحويل القوالب الحالية إلى قوالب محفوظة في قاعدة البيانات."
            />
            <SettingPreview
              icon={<Medal />}
              title="معايير التصحيح"
              description="بناء معايير تصحيح جاهزة تساعد في التصحيح المتسق والتغذية الراجعة."
            />
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">قوالب الواجبات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              قوالب محفوظة يستخدمها المعلم عند إنشاء واجب جديد.
            </p>
          </div>
          <Badge variant="outline">{homeworkTemplates.length}</Badge>
        </div>
        <form className="grid gap-3 border-b p-4 lg:grid-cols-6" onSubmit={handleCreateTemplate}>
          <Input
            value={templateForm.code}
            onChange={(event) =>
              setTemplateForm((prev) => ({ ...prev, code: event.target.value }))
            }
            placeholder="الكود"
            disabled={!canCreateTemplate}
          />
          <Input
            value={templateForm.name}
            onChange={(event) =>
              setTemplateForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="اسم القالب"
            disabled={!canCreateTemplate}
          />
          <Input
            value={templateForm.title}
            onChange={(event) =>
              setTemplateForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="عنوان الواجب"
            disabled={!canCreateTemplate}
          />
          <Input
            type="number"
            min={0.01}
            step={0.01}
            value={templateForm.maxScore}
            onChange={(event) =>
              setTemplateForm((prev) => ({ ...prev, maxScore: event.target.value }))
            }
            placeholder="الدرجة"
            disabled={!canCreateTemplate}
          />
          <Input
            value={templateForm.notes}
            onChange={(event) =>
              setTemplateForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="ملاحظات"
            disabled={!canCreateTemplate}
          />
          <Button
            type="submit"
            disabled={!canCreateTemplate || createTemplateMutation.isPending}
          >
            إضافة قالب
          </Button>
          <div className="lg:col-span-6">
            <TextareaField
              value={templateForm.content}
              onChange={(event) =>
                setTemplateForm((prev) => ({ ...prev, content: event.target.value }))
              }
              placeholder="محتوى القالب"
              rows={2}
              disabled={!canCreateTemplate}
            />
          </div>
        </form>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {homeworkTemplates.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-4 rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              لا توجد قوالب واجبات محفوظة بعد.
            </div>
          ) : (
            homeworkTemplates.map((template) => (
              <div key={template.id} className="rounded-lg border bg-muted/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{template.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNameCodeLabel(template.title, template.code)}
                    </div>
                  </div>
                  <Badge variant={template.isSystem ? "secondary" : "outline"}>
                    {template.isSystem ? "نظامي" : "مخصص"}
                  </Badge>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  الدرجة: {template.maxScore}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                    disabled={
                      !canDeleteTemplate ||
                      template.isSystem ||
                      deleteTemplateMutation.isPending
                    }
                  >
                    <Trash2 />
                    حذف
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SettingPreview({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/15 p-3">
      <span className="rounded-md border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </div>
  );
}
