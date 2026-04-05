import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { BillingEngineService } from './billing-engine.service';
import { ApplySiblingDiscountDto } from './dto/apply-sibling-discount.dto';
import { BulkGenerateInvoicesDto } from './dto/bulk-generate.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';

@ApiTags('Finance - Billing Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/billing')
export class BillingEngineController {
  constructor(private readonly billingEngineService: BillingEngineService) {}

  @Get('defaults')
  @RequirePermissions('billing.read-statement')
  @ApiOperation({ summary: 'Suggested daily billing defaults' })
  getDefaults() {
    return this.billingEngineService.getDefaults();
  }

  @Post('bulk-generate')
  @RequirePermissions('billing.generate')
  @ApiOperation({ summary: 'توليد فواتير جماعية — Bulk Invoice Generation' })
  bulkGenerate(
    @Body() payload: BulkGenerateInvoicesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingEngineService.bulkGenerate(payload, user.userId);
  }

  @Post('apply-sibling-discount')
  @RequirePermissions('billing.apply-discount')
  @ApiOperation({ summary: 'تطبيق خصم الإخوة — Apply Sibling Discount' })
  applySiblingDiscount(
    @Body() payload: ApplySiblingDiscountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingEngineService.applySiblingDiscount(payload, user.userId);
  }

  @Get('student-statement/:enrollmentId')
  @RequirePermissions('billing.read-statement')
  @ApiOperation({ summary: 'كشف حساب الطالب — Student Account Statement' })
  getStudentStatement(@Param('enrollmentId') enrollmentId: string) {
    return this.billingEngineService.getStudentStatement(enrollmentId);
  }

  @Get('family-balance/:guardianId')
  @RequirePermissions('billing.read-statement')
  @ApiOperation({ summary: 'رصيد العائلة — Family Balance' })
  getFamilyBalance(@Param('guardianId') guardianId: string) {
    return this.billingEngineService.getFamilyBalance(guardianId);
  }

  @Post('process-withdrawal')
  @RequirePermissions('billing.process-withdrawal')
  @ApiOperation({ summary: 'معالجة انسحاب طالب — Proration & Settlement' })
  processWithdrawal(
    @Body() payload: ProcessWithdrawalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingEngineService.processWithdrawal(payload, user.userId);
  }
}
