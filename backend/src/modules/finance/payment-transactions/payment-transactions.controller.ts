import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { ListPaymentTransactionsDto } from './dto/list-payment-transactions.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';
import { PaymentTransactionsService } from './payment-transactions.service';

@ApiTags('Finance - Payment Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/payment-transactions')
export class PaymentTransactionsController {
  constructor(
    private readonly paymentTransactionsService: PaymentTransactionsService,
  ) {}

  @Post()
  @RequirePermissions('payment-transactions.create')
  @ApiOperation({ summary: 'Create payment transaction' })
  create(
    @Body() payload: CreatePaymentTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentTransactionsService.create(payload, user.userId);
  }

  @Post('simulate')
  @RequirePermissions('payment-transactions.simulate')
  @ApiOperation({ summary: 'Simulate payment transaction (internal)' })
  simulate(
    @Body() payload: SimulatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentTransactionsService.simulate(payload, user.userId);
  }

  @Post(':id/reconcile')
  @RequirePermissions('payment-transactions.reconcile')
  @ApiOperation({ summary: 'Reconcile payment transaction to ledger' })
  reconcile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.paymentTransactionsService.reconcile(id, user.userId);
  }

  @Get()
  @RequirePermissions('payment-transactions.read')
  @ApiOperation({ summary: 'Get paginated payment transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'gatewayId', required: false, type: Number })
  @ApiQuery({ name: 'enrollmentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(@Query() query: ListPaymentTransactionsDto) {
    return this.paymentTransactionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('payment-transactions.read')
  @ApiOperation({ summary: 'Get payment transaction by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentTransactionsService.findOne(id);
  }

  @Get(':id/receipt')
  @RequirePermissions('payment-transactions.read')
  @ApiOperation({ summary: 'Get digital receipt for payment transaction' })
  getReceipt(@Param('id') id: string) {
    return this.paymentTransactionsService.getReceipt(id);
  }

  @Patch(':id')
  @RequirePermissions('payment-transactions.update')
  @ApiOperation({ summary: 'Update payment transaction' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdatePaymentTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentTransactionsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('payment-transactions.delete')
  @ApiOperation({ summary: 'Soft delete payment transaction' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.paymentTransactionsService.remove(id, user.userId);
  }
}
