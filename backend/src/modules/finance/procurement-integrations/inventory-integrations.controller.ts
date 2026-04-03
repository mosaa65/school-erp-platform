import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { InventoryAdjustmentJournalResponseDto } from './dto/inventory-adjustment-journal-response.dto';
import { InventoryAdjustmentJournalDto } from './dto/inventory-adjustment-journal.dto';
import { ProcurementIntegrationsService } from './procurement-integrations.service';

@ApiTags('Finance - Inventory Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/inventory')
export class InventoryIntegrationsController {
  constructor(
    private readonly procurementIntegrationsService: ProcurementIntegrationsService,
  ) {}

  @Post('adjustment-journal')
  @RequirePermissions('finance-procurement.purchase-journal')
  @ApiOperation({ summary: 'Create inventory adjustment journal entry' })
  @ApiOkResponse({ type: InventoryAdjustmentJournalResponseDto })
  createInventoryAdjustmentJournal(
    @Body() payload: InventoryAdjustmentJournalDto,
    @CurrentUser() user: AuthUser,
  ): Promise<InventoryAdjustmentJournalResponseDto> {
    return this.procurementIntegrationsService.createInventoryAdjustmentJournal(
      payload,
      user.userId,
    );
  }
}
