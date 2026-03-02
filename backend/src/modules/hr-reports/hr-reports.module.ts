import { Module } from '@nestjs/common';
import { HrReportsController } from './hr-reports.controller';
import { HrReportsService } from './hr-reports.service';

@Module({
  controllers: [HrReportsController],
  providers: [HrReportsService],
})
export class HrReportsModule {}
