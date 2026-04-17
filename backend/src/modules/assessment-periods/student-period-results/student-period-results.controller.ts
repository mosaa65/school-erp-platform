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
import { CalculateStudentPeriodResultsDto } from './dto/calculate-student-period-results.dto';
import { CreateStudentPeriodResultDto } from './dto/create-student-period-result.dto';
import { ListStudentPeriodResultsDto } from './dto/list-student-period-results.dto';
import { UpdateStudentPeriodResultDto } from './dto/update-student-period-result.dto';
import { StudentPeriodResultsService } from './student-period-results.service';

@ApiTags('Student Period Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-period-results')
export class StudentPeriodResultsController {
  constructor(
    private readonly studentPeriodResultsService: StudentPeriodResultsService,
  ) {}

  @Post()
  @RequirePermissions('student-period-results.create')
  @ApiOperation({ summary: 'Create student period result' })
  create(
    @Body() payload: CreateStudentPeriodResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentPeriodResultsService.create(payload, user.userId);
  }

  @Post('calculate')
  @RequirePermissions('student-period-results.calculate')
  @ApiOperation({ summary: 'Calculate aggregated component results' })
  calculate(
    @Body() payload: CalculateStudentPeriodResultsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentPeriodResultsService.calculateAggregated(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('student-period-results.read')
  @ApiOperation({ summary: 'Get paginated student period results' })
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
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentPeriodResultsDto) {
    return this.studentPeriodResultsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-period-results.read')
  @ApiOperation({ summary: 'Get student period result by ID' })
  findOne(@Param('id') id: string) {
    return this.studentPeriodResultsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-period-results.update')
  @ApiOperation({ summary: 'Update student period result' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentPeriodResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentPeriodResultsService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('student-period-results.lock')
  @ApiOperation({ summary: 'Lock student period result and mark it approved' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentPeriodResultsService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('student-period-results.unlock')
  @ApiOperation({ summary: 'Unlock student period result' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentPeriodResultsService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-period-results.delete')
  @ApiOperation({ summary: 'Soft delete student period result' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentPeriodResultsService.remove(id, user.userId);
  }
}
