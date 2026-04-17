import { Module } from '@nestjs/common';
import { AssessmentPeriodsResourceModule } from './assessment-periods/assessment-periods.module';
import { AssessmentPeriodComponentsModule } from './assessment-period-components/assessment-period-components.module';
import { AssessmentComponentSourcePeriodsModule } from './assessment-component-source-periods/assessment-component-source-periods.module';
import { StudentPeriodResultsModule } from './student-period-results/student-period-results.module';
import { StudentPeriodComponentScoresModule } from './student-period-component-scores/student-period-component-scores.module';

@Module({
  imports: [
    AssessmentPeriodsResourceModule,
    AssessmentPeriodComponentsModule,
    AssessmentComponentSourcePeriodsModule,
    StudentPeriodResultsModule,
    StudentPeriodComponentScoresModule,
  ],
  exports: [
    AssessmentPeriodsResourceModule,
    AssessmentPeriodComponentsModule,
    AssessmentComponentSourcePeriodsModule,
    StudentPeriodResultsModule,
    StudentPeriodComponentScoresModule,
  ],
})
export class AssessmentPeriodsModule {}
