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
import { StudentEnrollmentStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto';
import { ListStudentEnrollmentsDto } from './dto/list-student-enrollments.dto';
import { UpdateStudentEnrollmentDto } from './dto/update-student-enrollment.dto';
import { StudentEnrollmentsService } from './student-enrollments.service';

@ApiTags('Student Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-enrollments')
export class StudentEnrollmentsController {
  constructor(
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  @Post()
  @RequirePermissions('student-enrollments.create')
  @ApiOperation({ summary: 'Create student enrollment' })
  create(
    @Body() payload: CreateStudentEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-enrollments.read')
  @ApiOperation({ summary: 'Get paginated student enrollments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StudentEnrollmentStatus,
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentEnrollmentsDto) {
    return this.studentEnrollmentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-enrollments.read')
  @ApiOperation({ summary: 'Get student enrollment by ID' })
  findOne(@Param('id') id: string) {
    return this.studentEnrollmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-enrollments.update')
  @ApiOperation({ summary: 'Update student enrollment' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-enrollments.delete')
  @ApiOperation({ summary: 'Soft delete student enrollment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentEnrollmentsService.remove(id, user.userId);
  }
}
