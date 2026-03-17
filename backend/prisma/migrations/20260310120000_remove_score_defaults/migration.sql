-- Remove implicit defaults for score-related fields to enforce explicit configuration.

ALTER TABLE grading_policies
  ALTER max_exam_score DROP DEFAULT,
  ALTER max_homework_score DROP DEFAULT,
  ALTER max_attendance_score DROP DEFAULT,
  ALTER max_activity_score DROP DEFAULT,
  ALTER max_contribution_score DROP DEFAULT,
  ALTER passing_score DROP DEFAULT;

ALTER TABLE grading_policy_components
  ALTER max_score DROP DEFAULT;

ALTER TABLE exam_assessments
  ALTER max_score DROP DEFAULT;

ALTER TABLE homeworks
  ALTER max_score DROP DEFAULT;
