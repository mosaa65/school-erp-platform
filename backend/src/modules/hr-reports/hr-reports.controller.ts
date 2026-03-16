import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { HrSummaryQueryDto } from './dto/hr-summary-query.dto';
import { HrReportsService } from './hr-reports.service';

@ApiTags('HR Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr-reports')
export class HrReportsController {
  constructor(private readonly hrReportsService: HrReportsService) {}

  @Get('summary')
  @RequirePermissions('hr-reports.read')
  @ApiOperation({ summary: 'Get HR operational summary report' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  summary(@Query() query: HrSummaryQueryDto) {
    return this.hrReportsService.getSummary(query);
  }
}
