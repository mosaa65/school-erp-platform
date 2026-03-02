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
import { StudentAttendanceStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentAttendanceDto } from './dto/create-student-attendance.dto';
import { ListStudentAttendanceDto } from './dto/list-student-attendance.dto';
import { UpdateStudentAttendanceDto } from './dto/update-student-attendance.dto';
import { StudentAttendanceService } from './student-attendance.service';

@ApiTags('Student Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-attendance')
export class StudentAttendanceController {
  constructor(
    private readonly studentAttendanceService: StudentAttendanceService,
  ) {}

  @Post()
  @RequirePermissions('student-attendance.create')
  @ApiOperation({ summary: 'Create student attendance record' })
  create(
    @Body() payload: CreateStudentAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentAttendanceService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-attendance.read')
  @ApiOperation({ summary: 'Get paginated student attendance records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StudentAttendanceStatus,
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentAttendanceDto) {
    return this.studentAttendanceService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-attendance.read')
  @ApiOperation({ summary: 'Get student attendance record by ID' })
  findOne(@Param('id') id: string) {
    return this.studentAttendanceService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-attendance.update')
  @ApiOperation({ summary: 'Update student attendance record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentAttendanceService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-attendance.delete')
  @ApiOperation({ summary: 'Soft delete student attendance record' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentAttendanceService.remove(id, user.userId);
  }
}
