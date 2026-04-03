import { Body, Controller, Get, Param, Post, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { HrIntegrationsService } from './hr-integrations.service';
import { DeductionJournalDto } from './dto/deduction-journal.dto';
import { PayrollPreviewQueryDto } from './dto/payroll-preview-query.dto';
import { PayrollSummaryQueryDto } from './dto/payroll-summary-query.dto';
import { PayrollJournalDto } from './dto/payroll-journal.dto';

@ApiTags('Finance - HR Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/hr')
export class HrIntegrationsController {
  constructor(private readonly hrIntegrationsService: HrIntegrationsService) {}

  @Post('payroll-journal')
  @RequirePermissions('finance-hr.payroll-journal')
  @ApiOperation({ summary: 'Generate monthly payroll journal entry' })
  createPayrollJournal(
    @Body() payload: PayrollJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hrIntegrationsService.createPayrollJournal(payload, user.userId);
  }

  @Get('payroll-summary/:month')
  @RequirePermissions('finance-hr.payroll-summary')
  @ApiOperation({ summary: 'Get payroll summary for a month' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getPayrollSummary(
    @Param('month', ParseIntPipe) month: number,
    @Query() query: PayrollSummaryQueryDto,
  ) {
    return this.hrIntegrationsService.getPayrollSummary(month, query.year);
  }

  @Get('payroll-preview/:month')
  @RequirePermissions('finance-hr.payroll-summary')
  @ApiOperation({
    summary:
      'Preview monthly payroll from active contracts and approved unpaid leave requests',
  })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  getPayrollPreview(
    @Param('month', ParseIntPipe) month: number,
    @Query() query: PayrollPreviewQueryDto,
  ) {
    return this.hrIntegrationsService.getPayrollPreview(month, query);
  }

  @Post('deduction-journal')
  @RequirePermissions('finance-hr.deduction-journal')
  @ApiOperation({ summary: 'Generate employee deduction journal entry' })
  createDeductionJournal(
    @Body() payload: DeductionJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hrIntegrationsService.createDeductionJournal(payload, user.userId);
  }

  @Get('employee-balance/:id')
  @RequirePermissions('finance-hr.employee-balance')
  @ApiOperation({ summary: 'Get employee financial balance' })
  getEmployeeBalance(@Param('id') id: string) {
    return this.hrIntegrationsService.getEmployeeBalance(id);
  }
}
