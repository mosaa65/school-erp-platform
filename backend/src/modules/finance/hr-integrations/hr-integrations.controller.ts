import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { HrIntegrationsService } from './hr-integrations.service';
import { DeductionJournalDto } from './dto/deduction-journal.dto';
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

  @Post('deduction-journal')
  @RequirePermissions('finance-hr.deduction-journal')
  @ApiOperation({ summary: 'Generate employee deduction journal entry' })
  createDeductionJournal(
    @Body() payload: DeductionJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hrIntegrationsService.createDeductionJournal(payload, user.userId);
  }
}
