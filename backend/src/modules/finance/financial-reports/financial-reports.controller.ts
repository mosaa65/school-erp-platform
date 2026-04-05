import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { FinancialReportsService } from './financial-reports.service';

@ApiTags('Finance - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/reports')
export class FinancialReportsController {
  constructor(
    private readonly financialReportsService: FinancialReportsService,
  ) {}

  // ─── Existing Reports ─────────────────────────────────────────────

  @Get('trial-balance')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'ميزان المراجعة — Trial Balance' })
  @ApiQuery({ name: 'fiscalYearId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'includeHeaders', required: false, type: Boolean })
  @ApiQuery({ name: 'asOfDate', required: false, type: String })
  getTrialBalance(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('branchId') branchId?: string,
    @Query('includeHeaders') includeHeaders?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.financialReportsService.getTrialBalance({
      fiscalYearId: fiscalYearId ? Number(fiscalYearId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
      includeHeaders: includeHeaders !== 'false',
      asOfDate,
    });
  }

  @Get('general-ledger')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'دفتر الأستاذ العام — General Ledger' })
  @ApiQuery({ name: 'accountId', required: false, type: Number })
  @ApiQuery({ name: 'fiscalYearId', required: false, type: Number })
  @ApiQuery({ name: 'fiscalPeriodId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getGeneralLedger(
    @Query('accountId') accountId?: string,
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('fiscalPeriodId') fiscalPeriodId?: string,
    @Query('branchId') branchId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financialReportsService.getGeneralLedger({
      accountId: accountId ? Number(accountId) : undefined,
      fiscalYearId: fiscalYearId ? Number(fiscalYearId) : undefined,
      fiscalPeriodId: fiscalPeriodId ? Number(fiscalPeriodId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
      dateFrom,
      dateTo,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('account-summary')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'ملخص الحسابات حسب النوع — Account Summary' })
  getAccountSummary() {
    return this.financialReportsService.getAccountSummary();
  }

  // ─── New Advanced Reports ─────────────────────────────────────────

  @Get('income-statement')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'قائمة الدخل — Income Statement' })
  @ApiQuery({ name: 'fiscalYearId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'YYYY-MM-DD' })
  getIncomeStatement(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('branchId') branchId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.financialReportsService.getIncomeStatement({
      fiscalYearId: fiscalYearId ? Number(fiscalYearId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('balance-sheet')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'الميزانية العمومية — Balance Sheet' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'asOfDate', required: false, type: String, description: 'YYYY-MM-DD' })
  getBalanceSheet(
    @Query('branchId') branchId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.financialReportsService.getBalanceSheet({
      branchId: branchId ? Number(branchId) : undefined,
      asOfDate,
    });
  }

  @Get('student-account-statement')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'كشف حساب الطالب — Student Account Statement' })
  @ApiQuery({ name: 'enrollmentId', required: true, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'YYYY-MM-DD' })
  getStudentAccountStatement(
    @Query('enrollmentId') enrollmentId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.financialReportsService.getStudentAccountStatement({
      enrollmentId,
      academicYearId,
      dateFrom,
      dateTo,
    });
  }

  @Get('vat-report')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'التقرير الضريبي — VAT Report' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  getVatReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.financialReportsService.getVatReport({
      dateFrom,
      dateTo,
      branchId: branchId ? Number(branchId) : undefined,
    });
  }

  @Get('accounts-receivable-aging')
  @RequirePermissions('financial-reports.read')
  @ApiOperation({ summary: 'أعمار الديون — Accounts Receivable Aging' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'asOfDate', required: false, type: String, description: 'YYYY-MM-DD' })
  getAccountsReceivableAging(
    @Query('branchId') branchId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.financialReportsService.getAccountsReceivableAging({
      branchId: branchId ? Number(branchId) : undefined,
      academicYearId,
      asOfDate,
    });
  }
}

