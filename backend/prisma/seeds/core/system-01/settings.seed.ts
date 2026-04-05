import {
  ReminderTickerType,
  SystemSettingType,
  type PrismaClient,
} from '@prisma/client';

export async function seedSystem01Settings(prisma: PrismaClient) {
  const calendarSettings = [
    {
      settingKey: 'default_calendar',
      settingValue: 'hijri',
      description: 'التقويم الافتراضي للعرض',
    },
    {
      settingKey: 'weekend_days',
      settingValue: '7',
      description: 'أيام نهاية الأسبوع (6=الخميس, 7=الجمعة)',
    },
    {
      settingKey: 'date_format_hijri',
      settingValue: 'YYYY/MM/DD',
      description: 'صيغة التاريخ الهجري',
    },
    {
      settingKey: 'date_format_gregorian',
      settingValue: 'YYYY-MM-DD',
      description: 'صيغة التاريخ الميلادي',
    },
    {
      settingKey: 'hijri_calendar_type',
      settingValue: 'umm_alqura',
      description: 'نوع التقويم الهجري',
    },
    {
      settingKey: 'week_start_day',
      settingValue: '1',
      description: 'يوم بداية الأسبوع (1=السبت)',
    },
    {
      settingKey: 'auto_calculate_school_days',
      settingValue: 'true',
      description: 'حساب أيام الدراسة تلقائياً',
    },
  ];

  for (const item of calendarSettings) {
    await prisma.calendarSetting.upsert({
      where: { settingKey: item.settingKey },
      update: {
        settingValue: item.settingValue,
        description: item.description,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        settingKey: item.settingKey,
        settingValue: item.settingValue,
        description: item.description,
      },
    });
  }

  const systemSettings = [
    {
      settingKey: 'founder_name',
      settingValue: 'خالد شبيطه',
      settingType: SystemSettingType.TEXT,
      category: 'identity',
      description: 'اسم مؤسس الموقع',
    },
    {
      settingKey: 'founder_year',
      settingValue: '١٤٤٧هـ',
      settingType: SystemSettingType.TEXT,
      category: 'identity',
      description: 'عام التأسيس',
    },
    {
      settingKey: 'company_name',
      settingValue: 'شركةون سوفت للحلول التقنية',
      settingType: SystemSettingType.TEXT,
      category: 'identity',
      description: 'اسم الشركة',
    },
    {
      settingKey: 'republic_logo',
      settingValue: null,
      settingType: SystemSettingType.IMAGE,
      category: 'identity',
      description: 'شعار الجمهورية',
    },
    {
      settingKey: 'curriculum_logo',
      settingValue: null,
      settingType: SystemSettingType.IMAGE,
      category: 'identity',
      description: 'شعار المناهج',
    },
    {
      settingKey: 'report_header_line1',
      settingValue: 'الجمهورية اليمنية',
      settingType: SystemSettingType.TEXT,
      category: 'reports',
      description: 'السطر الأول من رأس التقرير',
    },
    {
      settingKey: 'report_header_line2',
      settingValue: 'وزارة التربية والتعليم',
      settingType: SystemSettingType.TEXT,
      category: 'reports',
      description: 'السطر الثاني',
    },
    {
      settingKey: 'report_header_line3',
      settingValue: 'مكتب التربية والتعليم بمحافظة إب',
      settingType: SystemSettingType.TEXT,
      category: 'reports',
      description: 'السطر الثالث',
    },
    {
      settingKey: 'report_header_line4',
      settingValue: 'الإدارة التعليمية بمديرية العدين',
      settingType: SystemSettingType.TEXT,
      category: 'reports',
      description: 'السطر الرابع',
    },
    {
      settingKey: 'default_date_format',
      settingValue: 'hijri',
      settingType: SystemSettingType.TEXT,
      category: 'general',
      description: 'صيغة التاريخ الافتراضية',
    },
    {
      settingKey: 'session_timeout_hours',
      settingValue: '24',
      settingType: SystemSettingType.NUMBER,
      category: 'security',
      description: 'مدة انتهاء الجلسة بالساعات',
    },
    {
      settingKey: 'allow_grade_edit',
      settingValue: 'true',
      settingType: SystemSettingType.BOOLEAN,
      category: 'grades',
      description: 'السماح بتعديل الدرجات',
    },
    {
      settingKey: 'report_footer_text',
      settingValue: 'يعتبر هذا الكشف رسمي ولا يحتاج إلى ختم',
      settingType: SystemSettingType.TEXT,
      category: 'reports',
      description: 'نص تذييل التقارير الرسمي',
    },
    // ─── إعدادات الفروع (النموذج الهجين) ───────────────────────────────
    {
      settingKey: 'multi_branch_mode',
      settingValue: 'false',
      settingType: SystemSettingType.BOOLEAN,
      category: 'branches',
      description:
        'تفعيل وضع الفروع المتعددة (النموذج الهجين). عند التفعيل يمكن ربط الطلاب والفواتير بفروع منفصلة.',
    },
    {
      settingKey: 'default_branch_id',
      settingValue: null,
      settingType: SystemSettingType.NUMBER,
      category: 'branches',
      description:
        'معرّف الفرع الافتراضي المستخدم في وضع المدرسة الواحدة. يُحدَّث تلقائياً عند إنشاء الفرع الرئيسي.',
    },
  ];

  for (const item of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: item.settingKey },
      update: {
        settingValue: item.settingValue,
        settingType: item.settingType,
        category: item.category,
        description: item.description,
        isEditable: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        settingKey: item.settingKey,
        settingValue: item.settingValue,
        settingType: item.settingType,
        category: item.category,
        description: item.description,
        isEditable: true,
      },
    });
  }

  const reminderTickerItems = [
    {
      content: 'سبحان الله وبحمده، سبحان الله العظيم',
      tickerType: ReminderTickerType.DHIKR,
      displayOrder: 1,
    },
    {
      content: 'لا حول ولا قوة إلا بالله',
      tickerType: ReminderTickerType.DHIKR,
      displayOrder: 2,
    },
    {
      content: 'اللهم صل وسلم على نبينا محمد',
      tickerType: ReminderTickerType.DHIKR,
      displayOrder: 3,
    },
    {
      content: 'رب اشرح لي صدري ويسر لي أمري',
      tickerType: ReminderTickerType.DHIKR,
      displayOrder: 4,
    },
  ];

  for (const item of reminderTickerItems) {
    const existing = await prisma.reminderTicker.findFirst({
      where: {
        content: item.content,
        tickerType: item.tickerType,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.reminderTicker.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          displayOrder: item.displayOrder,
          deletedAt: null,
          updatedById: null,
        },
      });
      continue;
    }

    await prisma.reminderTicker.create({
      data: {
        content: item.content,
        tickerType: item.tickerType,
        displayOrder: item.displayOrder,
        isActive: true,
      },
    });
  }
}
