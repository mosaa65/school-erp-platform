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
import { BankReconciliationsService } from './bank-reconciliations.service';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto';
import { CreateReconciliationItemDto } from './dto/create-reconciliation-item.dto';
import { ListBankReconciliationsDto } from './dto/list-bank-reconciliations.dto';
import { UpdateBankReconciliationDto } from './dto/update-bank-reconciliation.dto';

@ApiTags('Finance - Bank Reconciliations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/bank-reconciliations')
export class BankReconciliationsController {
  constructor(
    private readonly bankReconciliationsService: BankReconciliationsService,
  ) {}

  @Post()
  @RequirePermissions('bank-reconciliations.create')
  @ApiOperation({ summary: 'Create bank reconciliation' })
  create(
    @Body() payload: CreateBankReconciliationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bankReconciliationsService.create(payload, user.userId);
  }

  @Post(':id/items')
  @RequirePermissions('bank-reconciliations.update')
  @ApiOperation({ summary: 'Add reconciliation item' })
  addItem(
    @Param('id') id: string,
    @Body() payload: CreateReconciliationItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bankReconciliationsService.addItem(id, payload, user.userId);
  }

  @Get()
  @RequirePermissions('bank-reconciliations.read')
  @ApiOperation({ summary: 'Get paginated bank reconciliations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'bankAccountId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(@Query() query: ListBankReconciliationsDto) {
    return this.bankReconciliationsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('bank-reconciliations.read')
  @ApiOperation({ summary: 'Get bank reconciliation by ID' })
  findOne(@Param('id') id: string) {
    return this.bankReconciliationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('bank-reconciliations.update')
  @ApiOperation({ summary: 'Update bank reconciliation' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateBankReconciliationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bankReconciliationsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('bank-reconciliations.delete')
  @ApiOperation({ summary: 'Soft delete bank reconciliation' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bankReconciliationsService.remove(id, user.userId);
  }
}
