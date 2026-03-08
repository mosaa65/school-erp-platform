import { expect, test } from "@playwright/test";
import {
  mockListWithPost,
  mockRelationshipTypeOptions,
  mockStudentsOptions,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildStudentFixtures } from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

type ParentNotificationListItem = {
  id: string;
  notificationNumber: number;
  studentId: string;
  notificationType: "POSITIVE" | "NEGATIVE";
  guardianTitleId: number | null;
  behaviorType: string | null;
  behaviorDescription: string | null;
  requiredAction: string | null;
  sendMethod: "PAPER" | "WHATSAPP" | "PHONE" | "OTHER";
  messengerName: string | null;
  isSent: boolean;
  sentDate: string | null;
  results: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: null;
  updatedBy: null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
  guardianTitleLookup: {
    id: number;
    code: string;
    nameAr: string;
    gender: "MALE" | "FEMALE" | "ALL";
    isActive: boolean;
  } | null;
};

type RelationshipTypeOption = {
  id: number;
  code: string;
  nameAr: string;
  gender: "MALE" | "FEMALE" | "ALL";
  isActive: boolean;
};

const relationshipTypeOptions: RelationshipTypeOption[] = [
  {
    id: 1,
    code: "FATHER",
    nameAr: "الأب",
    gender: "MALE",
    isActive: true,
  },
  {
    id: 2,
    code: "MOTHER",
    nameAr: "الأم",
    gender: "FEMALE",
    isActive: true,
  },
];

function buildParentNotificationListItem(
  student: {
    id: string;
    fullName: string;
    admissionNo: string | null;
    isActive: boolean;
  },
  overrides: Partial<ParentNotificationListItem> = {},
): ParentNotificationListItem {
  const guardianTitle =
    relationshipTypeOptions.find(
      (item) => item.id === (overrides.guardianTitleId ?? 1),
    ) ?? relationshipTypeOptions[0];

  return {
    id: overrides.id ?? "parent-notification-1",
    notificationNumber: overrides.notificationNumber ?? 1001,
    studentId: overrides.studentId ?? student.id,
    notificationType: overrides.notificationType ?? "NEGATIVE",
    guardianTitleId: overrides.guardianTitleId ?? guardianTitle.id,
    behaviorType: overrides.behaviorType ?? "سلوكي",
    behaviorDescription: overrides.behaviorDescription ?? "تأخر متكرر",
    requiredAction: overrides.requiredAction ?? "متابعة الحضور يوميًا",
    sendMethod: overrides.sendMethod ?? "PAPER",
    messengerName: overrides.messengerName ?? "إدارة المدرسة",
    isSent: overrides.isSent ?? false,
    sentDate: overrides.sentDate ?? null,
    results: overrides.results ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00.000Z",
    createdBy: null,
    updatedBy: null,
    student: {
      id: student.id,
      fullName: student.fullName,
      admissionNo: student.admissionNo,
      isActive: student.isActive,
    },
    guardianTitleLookup:
      overrides.guardianTitleId === null
        ? null
        : {
            id: guardianTitle.id,
            code: guardianTitle.code,
            nameAr: guardianTitle.nameAr,
            gender: guardianTitle.gender,
            isActive: guardianTitle.isActive,
          },
  };
}

test.describe("Parent Notifications", () => {
  test("loads list and creates a new parent notification", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.parentNotificationsCrud);

    const students = buildStudentFixtures(2);

    const notificationsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/parent-notifications**",
      initialItems: [buildParentNotificationListItem(students[0])],
      onCreate: (payload, context) => {
        const studentId =
          typeof payload.studentId === "string" ? payload.studentId : students[0].id;
        const student = students.find((item) => item.id === studentId) ?? students[0];
        const guardianTitleId =
          typeof payload.guardianTitleId === "number" ? payload.guardianTitleId : 1;
        const relationshipType =
          relationshipTypeOptions.find((item) => item.id === guardianTitleId) ??
          relationshipTypeOptions[0];

        return buildParentNotificationListItem(student, {
          id: `parent-notification-${context.postCount + 1}`,
          notificationNumber: 1001 + context.postCount,
          studentId,
          notificationType:
            payload.notificationType === "POSITIVE" ? "POSITIVE" : "NEGATIVE",
          guardianTitleId,
          behaviorType: typeof payload.behaviorType === "string" ? payload.behaviorType : null,
          behaviorDescription:
            typeof payload.behaviorDescription === "string"
              ? payload.behaviorDescription
              : null,
          requiredAction:
            typeof payload.requiredAction === "string" ? payload.requiredAction : null,
          sendMethod:
            payload.sendMethod === "WHATSAPP" ||
            payload.sendMethod === "PHONE" ||
            payload.sendMethod === "OTHER"
              ? payload.sendMethod
              : "PAPER",
          messengerName:
            typeof payload.messengerName === "string" ? payload.messengerName : null,
          isSent: payload.isSent === undefined ? false : Boolean(payload.isSent),
          sentDate: typeof payload.sentDate === "string" ? payload.sentDate : null,
          results: typeof payload.results === "string" ? payload.results : null,
          isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
          guardianTitleLookup: {
            id: relationshipType.id,
            code: relationshipType.code,
            nameAr: relationshipType.nameAr,
            gender: relationshipType.gender,
            isActive: relationshipType.isActive,
          },
        });
      },
    });

    await mockStudentsOptions(page, students);
    await mockRelationshipTypeOptions(page, relationshipTypeOptions);

    await openModulePage({
      page,
      path: "/app/parent-notifications",
      heading: "إشعارات أولياء الأمور",
    });
    await expectCardsCount(page, "parent-notification-card", 1);

    await page.getByTestId("parent-notification-form-student").selectOption("stu-2");
    await page.getByTestId("parent-notification-form-type").selectOption("POSITIVE");
    await page
      .getByTestId("parent-notification-form-guardian-title")
      .selectOption("2");
    await page
      .getByTestId("parent-notification-form-behavior-type")
      .fill("أكاديمي");
    await page
      .getByTestId("parent-notification-form-behavior-description")
      .fill("تحسن ملحوظ في مستوى المشاركة.");
    await page
      .getByTestId("parent-notification-form-required-action")
      .fill("تعزيز الطالب في المنزل.");
    await page.getByTestId("parent-notification-form-send-method").selectOption("WHATSAPP");
    await page
      .getByTestId("parent-notification-form-messenger-name")
      .fill("المرشد الطلابي");
    await page.getByTestId("parent-notification-form-is-sent").check();
    await page.getByTestId("parent-notification-form-sent-date").fill("2026-03-12");
    await page
      .getByTestId("parent-notification-form-results")
      .fill("استجابة إيجابية من ولي الأمر.");
    await page.getByTestId("parent-notification-form-submit").click();

    await expectCardsCount(page, "parent-notification-card", 2);
    await expect(
      page
        .getByTestId("parent-notification-card")
        .first()
        .getByText("النوع: إيجابي | الإرسال: واتس"),
    ).toBeVisible();

    const lastCreatePayload = notificationsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["studentId"]).toBe("stu-2");
    expect(lastCreatePayload?.["notificationType"]).toBe("POSITIVE");
    expect(lastCreatePayload?.["guardianTitleId"]).toBe(2);
    expect(lastCreatePayload?.["sentDate"]).toBe("2026-03-12T00:00:00.000Z");
  });

  test("validates sent date rule when notification is not sent", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.parentNotificationsCrud);

    const students = buildStudentFixtures(1);

    const notificationsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/parent-notifications**",
      initialItems: [],
    });
    await mockStudentsOptions(page, students);
    await mockRelationshipTypeOptions(page, relationshipTypeOptions);

    await openModulePage({
      page,
      path: "/app/parent-notifications",
      heading: "إشعارات أولياء الأمور",
    });

    await page.getByTestId("parent-notification-form-student").selectOption("stu-1");
    await page.getByTestId("parent-notification-form-is-sent").check();
    await page.getByTestId("parent-notification-form-sent-date").fill("2026-03-12");
    await page.getByTestId("parent-notification-form-is-sent").uncheck();
    await page.getByTestId("parent-notification-form-submit").click();

    await expectValidationMessage(
      page,
      "لا يمكن تحديد تاريخ الإرسال إذا كان الإشعار غير مرسل.",
    );
    expect(notificationsApi.getPostCount()).toBe(0);
  });
});
