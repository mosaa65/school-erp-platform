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
import { CreateChartOfAccountDto } from './dto/create-chart-of-account.dto';
import { ListChartOfAccountsDto } from './dto/list-chart-of-accounts.dto';
import { UpdateChartOfAccountDto } from './dto/update-chart-of-account.dto';
import { ChartOfAccountsService } from './chart-of-accounts.service';

@ApiTags('Finance - Chart of Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/chart-of-accounts')
export class ChartOfAccountsController {
  constructor(private readonly chartOfAccountsService: ChartOfAccountsService) {}

  @Post()
  @RequirePermissions('chart-of-accounts.create')
  @ApiOperation({ summary: 'Create chart of account' })
  create(
    @Body() payload: CreateChartOfAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chartOfAccountsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('chart-of-accounts.read')
  @ApiOperation({ summary: 'Get paginated chart of accounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'accountType', required: false, type: String })
  @ApiQuery({ name: 'parentId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'isHeader', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListChartOfAccountsDto) {
    return this.chartOfAccountsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('chart-of-accounts.read')
  @ApiOperation({ summary: 'Get chart of account by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chartOfAccountsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('chart-of-accounts.update')
  @ApiOperation({ summary: 'Update chart of account' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateChartOfAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chartOfAccountsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('chart-of-accounts.delete')
  @ApiOperation({ summary: 'Soft delete chart of account' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.chartOfAccountsService.remove(id, user.userId);
  }
}
