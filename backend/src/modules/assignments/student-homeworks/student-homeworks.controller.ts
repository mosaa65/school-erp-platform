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
import { CreateStudentHomeworkDto } from './dto/create-student-homework.dto';
import { ListStudentHomeworksDto } from './dto/list-student-homeworks.dto';
import { UpdateStudentHomeworkDto } from './dto/update-student-homework.dto';
import { StudentHomeworksService } from './student-homeworks.service';

@ApiTags('Student Homeworks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-homeworks')
export class StudentHomeworksController {
  constructor(
    private readonly studentHomeworksService: StudentHomeworksService,
  ) {}

  @Post()
  @RequirePermissions('student-homeworks.create')
  @ApiOperation({ summary: 'Create student homework tracking record' })
  create(
    @Body() payload: CreateStudentHomeworkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentHomeworksService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-homeworks.read')
  @ApiOperation({ summary: 'Get paginated student homework tracking records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'homeworkId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'isCompleted', required: false, type: Boolean })
  @ApiQuery({ name: 'fromSubmittedAt', required: false, type: String })
  @ApiQuery({ name: 'toSubmittedAt', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query() query: ListStudentHomeworksDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentHomeworksService.findAll(query, user.userId);
  }

  @Get(':id')
  @RequirePermissions('student-homeworks.read')
  @ApiOperation({ summary: 'Get student homework tracking record by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentHomeworksService.findOne(id, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('student-homeworks.update')
  @ApiOperation({ summary: 'Update student homework tracking record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentHomeworkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentHomeworksService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-homeworks.delete')
  @ApiOperation({ summary: 'Soft delete student homework tracking record' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentHomeworksService.remove(id, user.userId);
  }
}
