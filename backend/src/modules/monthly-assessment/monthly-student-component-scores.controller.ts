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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentPeriodComponentScoreDto } from '../assessment-periods/student-period-component-scores/dto/create-student-period-component-score.dto';
import { ListStudentPeriodComponentScoresDto } from '../assessment-periods/student-period-component-scores/dto/list-student-period-component-scores.dto';
import { UpdateStudentPeriodComponentScoreDto } from '../assessment-periods/student-period-component-scores/dto/update-student-period-component-score.dto';
import { MonthlyStudentComponentScoresService } from './monthly-student-component-scores.service';

@ApiTags('Monthly Student Component Scores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monthly-student-component-scores')
export class MonthlyStudentComponentScoresController {
  constructor(
    private readonly monthlyStudentComponentScoresService: MonthlyStudentComponentScoresService,
  ) {}

  @Post()
  @RequirePermissions('student-period-component-scores.create')
  @ApiOperation({ summary: 'Create monthly student component score' })
  create(
    @Body() payload: CreateStudentPeriodComponentScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyStudentComponentScoresService.create(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('student-period-component-scores.read')
  @ApiOperation({ summary: 'Get paginated monthly student component scores' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentPeriodResultId', required: false, type: String })
  @ApiQuery({ name: 'assessmentPeriodComponentId', required: false, type: String })
  @ApiQuery({ name: 'assessmentPeriodId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentPeriodComponentScoresDto) {
    return this.monthlyStudentComponentScoresService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-period-component-scores.read')
  @ApiOperation({ summary: 'Get monthly student component score by ID' })
  findOne(@Param('id') id: string) {
    return this.monthlyStudentComponentScoresService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-period-component-scores.update')
  @ApiOperation({ summary: 'Update monthly student component score' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentPeriodComponentScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyStudentComponentScoresService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('student-period-component-scores.delete')
  @ApiOperation({ summary: 'Delete monthly student component score' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyStudentComponentScoresService.remove(id, user.userId);
  }
}
