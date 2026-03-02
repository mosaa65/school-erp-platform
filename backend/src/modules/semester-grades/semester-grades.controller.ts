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
import { GradingWorkflowStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CalculateSemesterGradesDto } from './dto/calculate-semester-grades.dto';
import { CreateSemesterGradeDto } from './dto/create-semester-grade.dto';
import { FillFinalExamScoresDto } from './dto/fill-final-exam-scores.dto';
import { ListSemesterGradesDto } from './dto/list-semester-grades.dto';
import { UpdateSemesterGradeDto } from './dto/update-semester-grade.dto';
import { SemesterGradesService } from './semester-grades.service';

@ApiTags('Semester Grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('semester-grades')
export class SemesterGradesController {
  constructor(private readonly semesterGradesService: SemesterGradesService) {}

  @Post()
  @RequirePermissions('semester-grades.create')
  @ApiOperation({
    summary: 'Create semester grade for one enrollment and subject',
  })
  create(
    @Body() payload: CreateSemesterGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.semesterGradesService.create(payload, user.userId);
  }

  @Post('calculate')
  @RequirePermissions('semester-grades.calculate')
  @ApiOperation({
    summary:
      'Calculate semester work totals from monthly grades for section and subject',
  })
  calculate(
    @Body() payload: CalculateSemesterGradesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.semesterGradesService.calculate(payload, user.userId);
  }

  @Post('fill-final-exam-scores')
  @RequirePermissions('semester-grades.fill-final-exam')
  @ApiOperation({
    summary: 'Fill semester final exam scores from final exam assessments',
  })
  fillFinalExamScores(
    @Body() payload: FillFinalExamScoresDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.semesterGradesService.fillFinalExamScores(payload, user.userId);
  }

  @Get()
  @RequirePermissions('semester-grades.read')
  @ApiOperation({ summary: 'Get paginated semester grades' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListSemesterGradesDto) {
    return this.semesterGradesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('semester-grades.read')
  @ApiOperation({ summary: 'Get semester grade by ID' })
  findOne(@Param('id') id: string) {
    return this.semesterGradesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('semester-grades.update')
  @ApiOperation({ summary: 'Update semester grade manual fields and metadata' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateSemesterGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.semesterGradesService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('semester-grades.lock')
  @ApiOperation({ summary: 'Lock semester grade and mark it approved' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.semesterGradesService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('semester-grades.unlock')
  @ApiOperation({ summary: 'Unlock semester grade' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.semesterGradesService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('semester-grades.delete')
  @ApiOperation({ summary: 'Soft delete semester grade' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.semesterGradesService.remove(id, user.userId);
  }
}
