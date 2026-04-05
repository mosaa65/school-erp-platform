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
import { CreateInvoiceInstallmentDto } from './dto/create-invoice-installment.dto';
import { ListInvoiceInstallmentsDto } from './dto/list-invoice-installments.dto';
import { UpdateInvoiceInstallmentDto } from './dto/update-invoice-installment.dto';
import { InvoiceInstallmentsService } from './invoice-installments.service';

@ApiTags('Finance - Invoice Installments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/invoice-installments')
export class InvoiceInstallmentsController {
  constructor(
    private readonly invoiceInstallmentsService: InvoiceInstallmentsService,
  ) {}

  @Post()
  @RequirePermissions('invoice-installments.create')
  @ApiOperation({ summary: 'Create invoice installment' })
  create(
    @Body() payload: CreateInvoiceInstallmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoiceInstallmentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('invoice-installments.read')
  @ApiOperation({ summary: 'Get paginated invoice installments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'invoiceId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dueDateFrom', required: false, type: String })
  @ApiQuery({ name: 'dueDateTo', required: false, type: String })
  findAll(@Query() query: ListInvoiceInstallmentsDto) {
    return this.invoiceInstallmentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('invoice-installments.read')
  @ApiOperation({ summary: 'Get invoice installment by ID' })
  findOne(@Param('id') id: string) {
    return this.invoiceInstallmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('invoice-installments.update')
  @ApiOperation({ summary: 'Update invoice installment' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateInvoiceInstallmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoiceInstallmentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('invoice-installments.delete')
  @ApiOperation({ summary: 'Delete invoice installment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.invoiceInstallmentsService.remove(id, user.userId);
  }
}
