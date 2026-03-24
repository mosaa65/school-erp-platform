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
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Finance - Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermissions('expenses.create')
  @ApiOperation({ summary: 'Create expense entry' })
  create(@Body() payload: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expensesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'Get paginated expenses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'fundId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(@Query() query: ListExpensesDto) {
    return this.expensesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Update expense (before approval)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expensesService.update(id, payload, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('expenses.approve')
  @ApiOperation({ summary: 'Approve expense and post journal entry' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.expensesService.approve(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('expenses.delete')
  @ApiOperation({ summary: 'Delete expense (only if not approved)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.expensesService.remove(id, user.userId);
  }
}
