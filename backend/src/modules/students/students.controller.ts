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
import {
  StudentGender,
  StudentHealthStatus,
  StudentOrphanStatus,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @RequirePermissions('students.create')
  @ApiOperation({ summary: 'Create student profile' })
  create(@Body() payload: CreateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.create(payload, user.userId);
  }

  @Get()
  @RequireAnyPermissions('students.read', 'students.read.summary')
  @ApiOperation({ summary: 'Get paginated students' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'gender', required: false, enum: StudentGender })
  @ApiQuery({ name: 'genderId', required: false, type: Number })
  @ApiQuery({ name: 'bloodTypeId', required: false, type: Number })
  @ApiQuery({ name: 'localityId', required: false, type: Number })
  @ApiQuery({
    name: 'healthStatus',
    required: false,
    enum: StudentHealthStatus,
  })
  @ApiQuery({ name: 'healthStatusId', required: false, type: Number })
  @ApiQuery({
    name: 'orphanStatus',
    required: false,
    enum: StudentOrphanStatus,
  })
  @ApiQuery({ name: 'orphanStatusId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentsDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.findAll(query, user.userId);
  }

  @Get(':id')
  @RequirePermissions('students.read.details')
  @ApiOperation({ summary: 'Get student by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Update student profile' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('students.delete')
  @ApiOperation({ summary: 'Soft delete student profile' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.remove(id, user.userId);
  }
}
