import { Module } from '@nestjs/common';
import { GradingReportsController } from './grading-reports.controller';
import { GradingReportsService } from './grading-reports.service';

@Module({
  controllers: [GradingReportsController],
  providers: [GradingReportsService],
})
export class GradingReportsModule {}
