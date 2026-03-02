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
import { EmployeeAttendanceStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateEmployeeAttendanceDto } from './dto/create-employee-attendance.dto';
import { ListEmployeeAttendanceDto } from './dto/list-employee-attendance.dto';
import { UpdateEmployeeAttendanceDto } from './dto/update-employee-attendance.dto';
import { EmployeeAttendanceService } from './employee-attendance.service';

@ApiTags('Employee Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-attendance')
export class EmployeeAttendanceController {
  constructor(
    private readonly employeeAttendanceService: EmployeeAttendanceService,
  ) {}

  @Post()
  @RequirePermissions('employee-attendance.create')
  @ApiOperation({ summary: 'Create employee attendance record' })
  create(
    @Body() payload: CreateEmployeeAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeAttendanceService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-attendance.read')
  @ApiOperation({ summary: 'Get paginated employee attendance records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: EmployeeAttendanceStatus })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeAttendanceDto) {
    return this.employeeAttendanceService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-attendance.read')
  @ApiOperation({ summary: 'Get employee attendance record by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeAttendanceService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-attendance.update')
  @ApiOperation({ summary: 'Update employee attendance record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeAttendanceService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-attendance.delete')
  @ApiOperation({ summary: 'Soft delete employee attendance record' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeAttendanceService.remove(id, user.userId);
  }
}
