SELECT 'permissions' AS table_name, COUNT(*) AS total FROM permissions
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'school_profiles', COUNT(*) FROM school_profiles
UNION ALL SELECT 'academic_years', COUNT(*) FROM academic_years
UNION ALL SELECT 'academic_terms', COUNT(*) FROM academic_terms
UNION ALL SELECT 'grade_levels', COUNT(*) FROM grade_levels
UNION ALL SELECT 'sections', COUNT(*) FROM sections
UNION ALL SELECT 'subjects', COUNT(*) FROM subjects;
