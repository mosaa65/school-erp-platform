import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { CreatePaymentGatewayDto } from './dto/create-payment-gateway.dto';
import { ListPaymentGatewaysDto } from './dto/list-payment-gateways.dto';
import { UpdatePaymentGatewayDto } from './dto/update-payment-gateway.dto';
import { PaymentGatewaysService } from './payment-gateways.service';

@ApiTags('Finance - Payment Gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/payment-gateways')
export class PaymentGatewaysController {
  constructor(private readonly paymentGatewaysService: PaymentGatewaysService) {}

  @Post()
  @RequirePermissions('payment-gateways.create')
  @ApiOperation({ summary: 'Create payment gateway' })
  create(
    @Body() payload: CreatePaymentGatewayDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentGatewaysService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('payment-gateways.read')
  @ApiOperation({ summary: 'Get paginated payment gateways' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'gatewayType', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListPaymentGatewaysDto) {
    return this.paymentGatewaysService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('payment-gateways.read')
  @ApiOperation({ summary: 'Get payment gateway by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentGatewaysService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('payment-gateways.update')
  @ApiOperation({ summary: 'Update payment gateway' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdatePaymentGatewayDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentGatewaysService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('payment-gateways.delete')
  @ApiOperation({ summary: 'Soft delete payment gateway' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.paymentGatewaysService.remove(id, user.userId);
  }
}
