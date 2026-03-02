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
import { ExamAbsenceType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentExamScoreDto } from './dto/create-student-exam-score.dto';
import { ListStudentExamScoresDto } from './dto/list-student-exam-scores.dto';
import { UpdateStudentExamScoreDto } from './dto/update-student-exam-score.dto';
import { StudentExamScoresService } from './student-exam-scores.service';

@ApiTags('Student Exam Scores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-exam-scores')
export class StudentExamScoresController {
  constructor(
    private readonly studentExamScoresService: StudentExamScoresService,
  ) {}

  @Post()
  @RequirePermissions('student-exam-scores.create')
  @ApiOperation({ summary: 'Create student exam score' })
  create(
    @Body() payload: CreateStudentExamScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentExamScoresService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-exam-scores.read')
  @ApiOperation({ summary: 'Get paginated student exam scores' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'examAssessmentId', required: false, type: String })
  @ApiQuery({ name: 'examPeriodId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'isPresent', required: false, type: Boolean })
  @ApiQuery({ name: 'absenceType', required: false, enum: ExamAbsenceType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentExamScoresDto) {
    return this.studentExamScoresService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-exam-scores.read')
  @ApiOperation({ summary: 'Get student exam score by ID' })
  findOne(@Param('id') id: string) {
    return this.studentExamScoresService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-exam-scores.update')
  @ApiOperation({ summary: 'Update student exam score' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentExamScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentExamScoresService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-exam-scores.delete')
  @ApiOperation({ summary: 'Soft delete student exam score' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentExamScoresService.remove(id, user.userId);
  }
}
