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
import { CalculateStudentPeriodResultsDto } from '../assessment-periods/student-period-results/dto/calculate-student-period-results.dto';
import { CreateStudentPeriodResultDto } from '../assessment-periods/student-period-results/dto/create-student-period-result.dto';
import { ListStudentPeriodResultsDto } from '../assessment-periods/student-period-results/dto/list-student-period-results.dto';
import { UpdateStudentPeriodResultDto } from '../assessment-periods/student-period-results/dto/update-student-period-result.dto';
import { MonthlyStudentResultsService } from './monthly-student-results.service';

@ApiTags('Monthly Student Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monthly-student-results')
export class MonthlyStudentResultsController {
  constructor(
    private readonly monthlyStudentResultsService: MonthlyStudentResultsService,
  ) {}

  @Post()
  @RequirePermissions('student-period-results.create')
  @ApiOperation({ summary: 'Create monthly student result' })
  create(@Body() payload: CreateStudentPeriodResultDto, @CurrentUser() user: AuthUser) {
    return this.monthlyStudentResultsService.create(payload, user.userId);
  }

  @Post('calculate')
  @RequirePermissions('student-period-results.calculate')
  @ApiOperation({ summary: 'Calculate monthly student results' })
  calculate(
    @Body() payload: CalculateStudentPeriodResultsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyStudentResultsService.calculate(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-period-results.read')
  @ApiOperation({ summary: 'Get paginated monthly student results' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'assessmentPeriodId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'academicMonthId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'termSubjectOfferingId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentPeriodResultsDto) {
    return this.monthlyStudentResultsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-period-results.read')
  @ApiOperation({ summary: 'Get monthly student result by ID' })
  findOne(@Param('id') id: string) {
    return this.monthlyStudentResultsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-period-results.update')
  @ApiOperation({ summary: 'Update monthly student result' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentPeriodResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyStudentResultsService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('student-period-results.lock')
  @ApiOperation({ summary: 'Lock monthly student result' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyStudentResultsService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('student-period-results.unlock')
  @ApiOperation({ summary: 'Unlock monthly student result' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyStudentResultsService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-period-results.delete')
  @ApiOperation({ summary: 'Delete monthly student result' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyStudentResultsService.remove(id, user.userId);
  }
}
