import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { GenerateTransportInvoicesDto } from './dto/generate-transport-invoices.dto';
import { TransportMaintenanceExpenseDto } from './dto/transport-maintenance-expense.dto';
import { TransportSubscriptionFeeDto } from './dto/transport-subscription-fee.dto';
import { TransportIntegrationsService } from './transport-integrations.service';

@ApiTags('Finance - Transport Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/transport')
export class TransportIntegrationsController {
  constructor(
    private readonly transportIntegrationsService: TransportIntegrationsService,
  ) {}

  @Post('generate-invoices')
  @RequirePermissions('finance-transport.generate-invoices')
  @ApiOperation({ summary: 'Generate transport invoices for enrollments' })
  generateInvoices(
    @Body() payload: GenerateTransportInvoicesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transportIntegrationsService.generateInvoices(payload, user.userId);
  }

  @Post('subscription-fee')
  @RequirePermissions('finance-transport.subscription-fee')
  @ApiOperation({ summary: 'Add transport subscription fee to invoice' })
  addSubscriptionFee(
    @Body() payload: TransportSubscriptionFeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transportIntegrationsService.addSubscriptionFee(payload, user.userId);
  }

  @Post('maintenance-expense')
  @RequirePermissions('finance-transport.maintenance-expense')
  @ApiOperation({ summary: 'Record transport maintenance expense' })
  recordMaintenanceExpense(
    @Body() payload: TransportMaintenanceExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transportIntegrationsService.recordMaintenanceExpense(
      payload,
      user.userId,
    );
  }
}
