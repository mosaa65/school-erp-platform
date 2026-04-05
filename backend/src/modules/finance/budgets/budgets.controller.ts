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
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetsService } from './budgets.service';

@ApiTags('Finance - Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @RequirePermissions('budgets.create')
  @ApiOperation({ summary: 'Create budget with lines' })
  create(@Body() payload: CreateBudgetDto, @CurrentUser() user: AuthUser) {
    return this.budgetsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('budgets.read')
  @ApiOperation({ summary: 'Get paginated budgets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'budgetType', required: false, type: String })
  @ApiQuery({ name: 'fiscalYearId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findAll(@Query() query: ListBudgetsDto) {
    return this.budgetsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('budgets.read')
  @ApiOperation({ summary: 'Get budget by ID with lines' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('budgets.update')
  @ApiOperation({ summary: 'Update budget (DRAFT only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateBudgetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.budgetsService.update(id, payload, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('budgets.approve')
  @ApiOperation({ summary: 'Approve budget — DRAFT → APPROVED' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.budgetsService.approve(id, user.userId);
  }

  @Get(':id/budget-vs-actual')
  @RequirePermissions('budgets.read')
  @ApiOperation({ summary: 'Budget vs Actual report — الميزانية مقابل الفعلي' })
  getBudgetVsActual(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.getBudgetVsActual(id);
  }

  @Delete(':id')
  @RequirePermissions('budgets.delete')
  @ApiOperation({ summary: 'Soft delete budget (DRAFT only)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.budgetsService.remove(id, user.userId);
  }
}
