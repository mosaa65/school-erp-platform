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
import { GradingDetailsQueryDto } from './dto/grading-details-query.dto';
import { GradingSummaryQueryDto } from './dto/grading-summary-query.dto';
import { GradingReportsService } from './grading-reports.service';

@ApiTags('Grading Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grading-reports')
export class GradingReportsController {
  constructor(private readonly gradingReportsService: GradingReportsService) {}

  @Get('summary')
  @RequirePermissions('grading-reports.read')
  @ApiOperation({
    summary:
      'Get grading governance summary across semester grades, annual grades, and annual results',
  })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  summary(@Query() query: GradingSummaryQueryDto) {
    return this.gradingReportsService.getSummary(query);
  }

  @Get('details')
  @RequirePermissions('grading-reports.read')
  @ApiOperation({
    summary:
      'Get detailed annual result records with student/section context and derived grade description',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'promotionDecisionId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  details(@Query() query: GradingDetailsQueryDto) {
    return this.gradingReportsService.getDetails(query);
  }
}
