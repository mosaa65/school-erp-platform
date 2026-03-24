import { Module } from '@nestjs/common';
import { AnnualResultsModule } from './annual-results/annual-results.module';
import { AnnualStatusesModule } from './annual-statuses/annual-statuses.module';
import { GradingReportsModule } from './grading-reports/grading-reports.module';
import { PromotionDecisionsModule } from './promotion-decisions/promotion-decisions.module';

@Module({
  imports: [
    AnnualResultsModule,
    AnnualStatusesModule,
    PromotionDecisionsModule,
    GradingReportsModule,
  ],
  exports: [
    AnnualResultsModule,
    AnnualStatusesModule,
    PromotionDecisionsModule,
    GradingReportsModule,
  ],
})
export class ResultsDecisionsModule {}
