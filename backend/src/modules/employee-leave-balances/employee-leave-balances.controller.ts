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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateEmployeeLeaveBalanceDto } from './dto/create-employee-leave-balance.dto';
import { GenerateEmployeeLeaveBalancesDto } from './dto/generate-employee-leave-balances.dto';
import { ListEmployeeLeaveBalancesDto } from './dto/list-employee-leave-balances.dto';
import { UpdateEmployeeLeaveBalanceDto } from './dto/update-employee-leave-balance.dto';
import { EmployeeLeaveBalancesService } from './employee-leave-balances.service';

@ApiTags('Employee Leave Balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-leave-balances')
export class EmployeeLeaveBalancesController {
  constructor(
    private readonly employeeLeaveBalancesService: EmployeeLeaveBalancesService,
  ) {}

  @Post()
  @RequirePermissions('employee-leave-balances.create')
  @ApiOperation({ summary: 'Create employee leave balance' })
  create(
    @Body() payload: CreateEmployeeLeaveBalanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLeaveBalancesService.create(payload, user.userId);
  }

  @Post('generate')
  @RequirePermissions('employee-leave-balances.generate')
  @ApiOperation({ summary: 'Generate annual employee leave balances from entitlement defaults' })
  generate(
    @Body() payload: GenerateEmployeeLeaveBalancesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLeaveBalancesService.generate(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-leave-balances.read')
  @ApiOperation({ summary: 'Get paginated employee leave balances' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'leaveType', required: false, type: String })
  @ApiQuery({ name: 'balanceYear', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeLeaveBalancesDto) {
    return this.employeeLeaveBalancesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-leave-balances.read')
  @ApiOperation({ summary: 'Get employee leave balance by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeLeaveBalancesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-leave-balances.update')
  @ApiOperation({ summary: 'Update employee leave balance' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeLeaveBalanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLeaveBalancesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-leave-balances.delete')
  @ApiOperation({ summary: 'Soft delete employee leave balance' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLeaveBalancesService.remove(id, user.userId);
  }
}
