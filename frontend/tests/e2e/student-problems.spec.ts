import { expect, test } from "@playwright/test";
import { mockListWithPost, mockStudentsOptions } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildStudentFixtures } from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

type StudentProblemListItem = {
  id: string;
  studentId: string;
  problemDate: string;
  problemType: string | null;
  problemDescription: string;
  actionsTaken: string | null;
  hasMinutes: boolean;
  isResolved: boolean;
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
};

function buildStudentProblemListItem(
  student: {
    id: string;
    fullName: string;
    admissionNo: string | null;
    isActive: boolean;
  },
  overrides: Partial<StudentProblemListItem> = {},
): StudentProblemListItem {
  return {
    id: overrides.id ?? "student-problem-1",
    studentId: overrides.studentId ?? student.id,
    problemDate: overrides.problemDate ?? "2026-03-01T00:00:00.000Z",
    problemType: overrides.problemType ?? "سلوكي",
    problemDescription: overrides.problemDescription ?? "تأخر متكرر عن الحصة",
    actionsTaken: overrides.actionsTaken ?? "تم التواصل مع ولي الأمر",
    hasMinutes: overrides.hasMinutes ?? false,
    isResolved: overrides.isResolved ?? false,
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
  };
}

test.describe("Student Problems", () => {
  test("loads list and creates a new student problem", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.studentProblemsCrud);

    const students = buildStudentFixtures(2);

    const problemsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/student-problems**",
      initialItems: [buildStudentProblemListItem(students[0])],
      onCreate: (payload) => {
        const studentId =
          typeof payload.studentId === "string" ? payload.studentId : students[0].id;
        const student = students.find((item) => item.id === studentId) ?? students[0];

        return buildStudentProblemListItem(student, {
          id: "student-problem-2",
          studentId,
          problemDate:
            typeof payload.problemDate === "string"
              ? payload.problemDate
              : "2026-03-02T00:00:00.000Z",
          problemType: typeof payload.problemType === "string" ? payload.problemType : null,
          problemDescription:
            typeof payload.problemDescription === "string"
              ? payload.problemDescription
              : "وصف جديد",
          actionsTaken:
            typeof payload.actionsTaken === "string" ? payload.actionsTaken : null,
          hasMinutes: payload.hasMinutes === undefined ? false : Boolean(payload.hasMinutes),
          isResolved: payload.isResolved === undefined ? false : Boolean(payload.isResolved),
          isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        });
      },
    });

    await mockStudentsOptions(page, students);

    await openModulePage({
      page,
      path: "/app/student-problems",
      heading: "مشكلات الطلاب",
    });
    await expectCardsCount(page, "student-problem-card", 1);

    await page.getByTestId("student-problem-form-student").selectOption("stu-2");
    await page.getByTestId("student-problem-form-date").fill("2026-03-10");
    await page.getByTestId("student-problem-form-type").fill("سلوكي");
    await page
      .getByTestId("student-problem-form-description")
      .fill("تحدث دون إذن في الحصة");
    await page
      .getByTestId("student-problem-form-actions")
      .fill("تنبيه شفهي وتواصل مع ولي الأمر");
    await page.getByTestId("student-problem-form-has-minutes").check();
    await page.getByTestId("student-problem-form-submit").click();

    await expectCardsCount(page, "student-problem-card", 2);
    await expect(
      page
        .getByTestId("student-problem-card")
        .first()
        .getByText("الوصف: تحدث دون إذن في الحصة"),
    ).toBeVisible();

    const lastCreatePayload = problemsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["studentId"]).toBe("stu-2");
    expect(lastCreatePayload?.["problemDate"]).toBe("2026-03-10T00:00:00.000Z");
    expect(lastCreatePayload?.["hasMinutes"]).toBe(true);
  });

  test("validates required fields before creating", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.studentProblemsCrud);

    const students = buildStudentFixtures(1);

    const problemsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/student-problems**",
      initialItems: [],
    });
    await mockStudentsOptions(page, students);

    await openModulePage({
      page,
      path: "/app/student-problems",
      heading: "مشكلات الطلاب",
    });

    await page.getByTestId("student-problem-form-date").fill("2026-03-11");
    await page
      .getByTestId("student-problem-form-description")
      .fill("وصف بدون تحديد الطالب");
    await page.getByTestId("student-problem-form-submit").click();

    await expectValidationMessage(page, "الطالب وتاريخ المشكلة ووصف المشكلة حقول مطلوبة.");
    expect(problemsApi.getPostCount()).toBe(0);
  });
});
