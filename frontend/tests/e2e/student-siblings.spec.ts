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

type StudentSiblingListItem = {
  id: string;
  studentId: string;
  siblingId: string;
  relationship: "BROTHER" | "SISTER";
  notes: string | null;
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
  sibling: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
};

function buildStudentSiblingListItem(
  student: {
    id: string;
    fullName: string;
    admissionNo: string | null;
    isActive: boolean;
  },
  sibling: {
    id: string;
    fullName: string;
    admissionNo: string | null;
    isActive: boolean;
  },
  overrides: Partial<StudentSiblingListItem> = {},
): StudentSiblingListItem {
  return {
    id: overrides.id ?? "student-sibling-1",
    studentId: overrides.studentId ?? student.id,
    siblingId: overrides.siblingId ?? sibling.id,
    relationship: overrides.relationship ?? "BROTHER",
    notes: overrides.notes ?? "أخوة مباشرة",
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
    sibling: {
      id: sibling.id,
      fullName: sibling.fullName,
      admissionNo: sibling.admissionNo,
      isActive: sibling.isActive,
    },
  };
}

test.describe("Student Siblings", () => {
  test("loads list and creates a new sibling mapping", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.studentSiblingsCrud);

    const students = buildStudentFixtures(3);

    const siblingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/student-siblings**",
      initialItems: [buildStudentSiblingListItem(students[0], students[1])],
      onCreate: (payload) => {
        const studentId =
          typeof payload.studentId === "string" ? payload.studentId : students[0].id;
        const siblingId =
          typeof payload.siblingId === "string" ? payload.siblingId : students[1].id;
        const student = students.find((item) => item.id === studentId) ?? students[0];
        const sibling = students.find((item) => item.id === siblingId) ?? students[1];

        return buildStudentSiblingListItem(student, sibling, {
          id: "student-sibling-2",
          studentId,
          siblingId,
          relationship:
            payload.relationship === "SISTER" ? "SISTER" : "BROTHER",
          notes: typeof payload.notes === "string" ? payload.notes : null,
          isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        });
      },
    });

    await mockStudentsOptions(page, students);

    await openModulePage({
      page,
      path: "/app/student-siblings",
      heading: "الإخوة في المدرسة",
    });
    await expectCardsCount(page, "student-sibling-card", 1);

    await page.getByTestId("student-sibling-form-student").selectOption("stu-2");
    await page.getByTestId("student-sibling-form-sibling").selectOption("stu-3");
    await page.getByTestId("student-sibling-form-relationship").selectOption("SISTER");
    await page.getByTestId("student-sibling-form-notes").fill("أخت شقيقة");
    await page.getByTestId("student-sibling-form-submit").click();

    await expectCardsCount(page, "student-sibling-card", 2);
    await expect(
      page
        .getByTestId("student-sibling-card")
        .first()
        .getByText("نوع العلاقة: أخت"),
    ).toBeVisible();

    const lastCreatePayload = siblingsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["studentId"]).toBe("stu-2");
    expect(lastCreatePayload?.["siblingId"]).toBe("stu-3");
    expect(lastCreatePayload?.["relationship"]).toBe("SISTER");
  });

  test("validates student and sibling cannot be the same", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.studentSiblingsCrud);

    const students = buildStudentFixtures(2);

    const siblingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/student-siblings**",
      initialItems: [],
    });
    await mockStudentsOptions(page, students);

    await openModulePage({
      page,
      path: "/app/student-siblings",
      heading: "الإخوة في المدرسة",
    });

    await page.getByTestId("student-sibling-form-student").selectOption("stu-1");
    await page.getByTestId("student-sibling-form-sibling").selectOption("stu-1");
    await page.getByTestId("student-sibling-form-submit").click();

    await expectValidationMessage(page, "لا يمكن اختيار نفس الطالب في الطرفين.");
    expect(siblingsApi.getPostCount()).toBe(0);
  });
});
