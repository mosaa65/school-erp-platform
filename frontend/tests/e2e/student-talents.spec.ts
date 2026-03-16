import { expect, test } from "@playwright/test";
import {
  mockListWithPost,
  mockStudentsOptions,
  mockTalentsOptions,
} from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import {
  buildStudentFixtures,
  buildTalentFixtures,
} from "./helpers/fixtures";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

type StudentTalentListItem = {
  id: string;
  studentId: string;
  talentId: string;
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
  talent: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
};

function buildStudentTalentListItem(
  student: {
    id: string;
    fullName: string;
    admissionNo: string | null;
    isActive: boolean;
  },
  talent: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  },
  overrides: Partial<StudentTalentListItem> = {},
): StudentTalentListItem {
  return {
    id: overrides.id ?? "student-talent-1",
    studentId: overrides.studentId ?? student.id,
    talentId: overrides.talentId ?? talent.id,
    notes: overrides.notes ?? "يشارك في نادي الروبوت",
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
    talent: {
      id: talent.id,
      code: talent.code,
      name: talent.name,
      isActive: talent.isActive,
    },
  };
}

test.describe("Student Talents", () => {
  test("loads list and creates a new student-talent mapping", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.studentTalentsCrud);

    const students = buildStudentFixtures(2);
    const talents = buildTalentFixtures(2);

    const mappingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/student-talents**",
      initialItems: [buildStudentTalentListItem(students[0], talents[0])],
      onCreate: (payload) => {
        const studentId =
          typeof payload.studentId === "string" ? payload.studentId : students[0].id;
        const talentId =
          typeof payload.talentId === "string" ? payload.talentId : talents[0].id;
        const student = students.find((item) => item.id === studentId) ?? students[0];
        const talent = talents.find((item) => item.id === talentId) ?? talents[0];

        return buildStudentTalentListItem(student, talent, {
          id: "student-talent-2",
          studentId,
          talentId,
          notes: typeof payload.notes === "string" ? payload.notes : null,
          isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        });
      },
    });

    await mockStudentsOptions(page, students);
    await mockTalentsOptions(page, talents);

    await openModulePage({
      page,
      path: "/app/student-talents",
      heading: "مواهب الطلاب",
    });
    await expectCardsCount(page, "student-talent-card", 1);

    await page.getByTestId("student-talent-form-student").selectOption("stu-2");
    await page.getByTestId("student-talent-form-talent").selectOption("tal-2");
    await page.getByTestId("student-talent-form-notes").fill("مبدع في نادي التكنولوجيا");
    await page.getByTestId("student-talent-form-submit").click();

    await expectCardsCount(page, "student-talent-card", 2);
    await expect(
      page
        .getByTestId("student-talent-card")
        .first()
        .getByText("الموهبة: Robotics Coach (TAL-ROBO)"),
    ).toBeVisible();

    const lastCreatePayload = mappingsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["studentId"]).toBe("stu-2");
    expect(lastCreatePayload?.["talentId"]).toBe("tal-2");
  });

  test("validates required talent before creating", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.studentTalentsCrud);

    const students = buildStudentFixtures(1);
    const talents = buildTalentFixtures(1);

    const mappingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/student-talents**",
      initialItems: [],
    });
    await mockStudentsOptions(page, students);
    await mockTalentsOptions(page, talents);

    await openModulePage({
      page,
      path: "/app/student-talents",
      heading: "مواهب الطلاب",
    });

    await page.getByTestId("student-talent-form-student").selectOption("stu-1");
    await page.getByTestId("student-talent-form-submit").click();

    await expectValidationMessage(page, "الموهبة مطلوبة.");
    expect(mappingsApi.getPostCount()).toBe(0);
  });
});
