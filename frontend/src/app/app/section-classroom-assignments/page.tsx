import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SectionClassroomAssignmentsWorkspace } from "@/features/section-classroom-assignments/components/section-classroom-assignments-workspace";

type SectionClassroomAssignmentsPageProps = {
  searchParams?: {
    sectionId?: string | string[];
    gradeLevelId?: string | string[];
    classroomId?: string | string[];
    academicYearId?: string | string[];
    mode?: string | string[];
  };
};

function firstQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function SectionClassroomAssignmentsPage({
  searchParams,
}: SectionClassroomAssignmentsPageProps) {
  return (
    <PermissionGuard permission="sections.read">
      <div className="space-y-4">
        <SectionClassroomAssignmentsWorkspace
          initialSectionId={firstQueryValue(searchParams?.sectionId)}
          initialGradeLevelId={firstQueryValue(searchParams?.gradeLevelId)}
          initialClassroomId={firstQueryValue(searchParams?.classroomId)}
          initialAcademicYearId={firstQueryValue(searchParams?.academicYearId)}
          initialMode={firstQueryValue(searchParams?.mode)}
        />
      </div>
    </PermissionGuard>
  );
}
