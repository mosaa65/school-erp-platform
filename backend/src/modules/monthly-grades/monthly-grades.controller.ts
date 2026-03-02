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
import { CalculateMonthlyGradesDto } from './dto/calculate-monthly-grades.dto';
import { CreateMonthlyGradeDto } from './dto/create-monthly-grade.dto';
import { ListMonthlyGradesDto } from './dto/list-monthly-grades.dto';
import { UpdateMonthlyGradeDto } from './dto/update-monthly-grade.dto';
import { MonthlyGradesService } from './monthly-grades.service';

@ApiTags('Monthly Grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monthly-grades')
export class MonthlyGradesController {
  constructor(private readonly monthlyGradesService: MonthlyGradesService) {}

  @Post()
  @RequirePermissions('monthly-grades.create')
  @ApiOperation({
    summary: 'Create a monthly grade for one enrollment and subject',
  })
  create(
    @Body() payload: CreateMonthlyGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyGradesService.create(payload, user.userId);
  }

  @Post('calculate')
  @RequirePermissions('monthly-grades.calculate')
  @ApiOperation({
    summary:
      'Calculate monthly grades for all active enrollments in a section for one subject',
  })
  calculate(
    @Body() payload: CalculateMonthlyGradesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyGradesService.calculate(payload, user.userId);
  }

  @Get()
  @RequirePermissions('monthly-grades.read')
  @ApiOperation({ summary: 'Get paginated monthly grades' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'academicMonthId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListMonthlyGradesDto) {
    return this.monthlyGradesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('monthly-grades.read')
  @ApiOperation({ summary: 'Get monthly grade by ID' })
  findOne(@Param('id') id: string) {
    return this.monthlyGradesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('monthly-grades.update')
  @ApiOperation({
    summary:
      'Update manual monthly grade fields (activity and contribution) and metadata',
  })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateMonthlyGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyGradesService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('monthly-grades.lock')
  @ApiOperation({ summary: 'Lock monthly grade for governance' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyGradesService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('monthly-grades.unlock')
  @ApiOperation({ summary: 'Unlock monthly grade' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyGradesService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('monthly-grades.delete')
  @ApiOperation({ summary: 'Soft delete monthly grade' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyGradesService.remove(id, user.userId);
  }
}
