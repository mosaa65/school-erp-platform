import { Module } from '@nestjs/common';
import { AnnualGradesModule } from './annual-grades/annual-grades.module';
import { MonthlyCustomComponentScoresModule } from './monthly-custom-component-scores/monthly-custom-component-scores.module';
import { MonthlyGradesModule } from './monthly-grades/monthly-grades.module';
import { SemesterGradesModule } from './semester-grades/semester-grades.module';

@Module({
  imports: [
    MonthlyGradesModule,
    MonthlyCustomComponentScoresModule,
    SemesterGradesModule,
    AnnualGradesModule,
  ],
  exports: [
    MonthlyGradesModule,
    MonthlyCustomComponentScoresModule,
    SemesterGradesModule,
    AnnualGradesModule,
  ],
})
export class GradeAggregationModule {}
