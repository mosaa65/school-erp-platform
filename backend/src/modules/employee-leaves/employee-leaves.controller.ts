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
import { CreateEmployeeLeaveDto } from './dto/create-employee-leave.dto';
import { ListEmployeeLeavesDto } from './dto/list-employee-leaves.dto';
import { UpdateEmployeeLeaveDto } from './dto/update-employee-leave.dto';
import { EmployeeLeavesService } from './employee-leaves.service';

@ApiTags('Employee Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-leaves')
export class EmployeeLeavesController {
  constructor(private readonly employeeLeavesService: EmployeeLeavesService) {}

  @Post()
  @RequirePermissions('employee-leaves.create')
  @ApiOperation({ summary: 'Create employee leave request' })
  create(
    @Body() payload: CreateEmployeeLeaveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLeavesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-leaves.read')
  @ApiOperation({ summary: 'Get paginated employee leave requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'leaveType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeLeavesDto) {
    return this.employeeLeavesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-leaves.read')
  @ApiOperation({ summary: 'Get employee leave request by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeLeavesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-leaves.update')
  @ApiOperation({ summary: 'Update employee leave request' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeLeaveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLeavesService.update(id, payload, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('employee-leaves.approve')
  @ApiOperation({ summary: 'Approve employee leave request' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLeavesService.approve(id, user.userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('employee-leaves.approve')
  @ApiOperation({ summary: 'Reject employee leave request' })
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLeavesService.reject(id, user.userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending employee leave request' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLeavesService.cancel(id, user);
  }

  @Delete(':id')
  @RequirePermissions('employee-leaves.delete')
  @ApiOperation({ summary: 'Soft delete employee leave request' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLeavesService.remove(id, user.userId);
  }
}
