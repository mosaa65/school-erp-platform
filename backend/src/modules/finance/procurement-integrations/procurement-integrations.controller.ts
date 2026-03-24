import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { ProcurementIntegrationsService } from './procurement-integrations.service';
import { DepreciationJournalDto } from './dto/depreciation-journal.dto';
import { ProcurementPaymentJournalDto } from './dto/procurement-payment-journal.dto';
import { PurchaseJournalDto } from './dto/purchase-journal.dto';

@ApiTags('Finance - Procurement Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/procurement')
export class ProcurementIntegrationsController {
  constructor(
    private readonly procurementIntegrationsService: ProcurementIntegrationsService,
  ) {}

  @Post('purchase-journal')
  @RequirePermissions('finance-procurement.purchase-journal')
  @ApiOperation({ summary: 'Create purchase journal entry' })
  createPurchaseJournal(
    @Body() payload: PurchaseJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.procurementIntegrationsService.createPurchaseJournal(
      payload,
      user.userId,
    );
  }

  @Post('payment-journal')
  @RequirePermissions('finance-procurement.payment-journal')
  @ApiOperation({ summary: 'Create vendor payment journal entry' })
  createPaymentJournal(
    @Body() payload: ProcurementPaymentJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.procurementIntegrationsService.createPaymentJournal(
      payload,
      user.userId,
    );
  }

  @Post('depreciation-journal')
  @RequirePermissions('finance-procurement.depreciation-journal')
  @ApiOperation({ summary: 'Create depreciation journal entry' })
  createDepreciationJournal(
    @Body() payload: DepreciationJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.procurementIntegrationsService.createDepreciationJournal(
      payload,
      user.userId,
    );
  }
}
