import { Module } from '@nestjs/common';
import { ExamAssessmentsModule } from './exam-assessments/exam-assessments.module';
import { ExamPeriodsModule } from './exam-periods/exam-periods.module';
import { StudentExamScoresModule } from './student-exam-scores/student-exam-scores.module';

@Module({
  imports: [ExamPeriodsModule, ExamAssessmentsModule, StudentExamScoresModule],
  exports: [ExamPeriodsModule, ExamAssessmentsModule, StudentExamScoresModule],
})
export class ExamsModule {}
