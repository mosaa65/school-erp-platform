import { Module } from '@nestjs/common';
import { MonthlyAssessmentComponentsController } from './monthly-assessment-components.controller';
import { MonthlyAssessmentComponentsService } from './monthly-assessment-components.service';
import { MonthlyAssessmentPeriodsController } from './monthly-assessment-periods.controller';
import { MonthlyAssessmentPeriodsService } from './monthly-assessment-periods.service';
import { MonthlyStudentComponentScoresController } from './monthly-student-component-scores.controller';
import { MonthlyStudentComponentScoresService } from './monthly-student-component-scores.service';
import { MonthlyStudentResultsController } from './monthly-student-results.controller';
import { MonthlyStudentResultsService } from './monthly-student-results.service';

@Module({
  controllers: [
    MonthlyAssessmentPeriodsController,
    MonthlyAssessmentComponentsController,
    MonthlyStudentResultsController,
    MonthlyStudentComponentScoresController,
  ],
  providers: [
    MonthlyAssessmentPeriodsService,
    MonthlyAssessmentComponentsService,
    MonthlyStudentResultsService,
    MonthlyStudentComponentScoresService,
  ],
  exports: [
    MonthlyAssessmentPeriodsService,
    MonthlyAssessmentComponentsService,
    MonthlyStudentResultsService,
    MonthlyStudentComponentScoresService,
  ],
})
export class MonthlyAssessmentModule {}
