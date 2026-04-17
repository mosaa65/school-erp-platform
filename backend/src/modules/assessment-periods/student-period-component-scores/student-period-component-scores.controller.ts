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
import { CreateStudentPeriodComponentScoreDto } from './dto/create-student-period-component-score.dto';
import { ListStudentPeriodComponentScoresDto } from './dto/list-student-period-component-scores.dto';
import { UpdateStudentPeriodComponentScoreDto } from './dto/update-student-period-component-score.dto';
import { StudentPeriodComponentScoresService } from './student-period-component-scores.service';

@ApiTags('Student Period Component Scores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-period-component-scores')
export class StudentPeriodComponentScoresController {
  constructor(
    private readonly studentPeriodComponentScoresService: StudentPeriodComponentScoresService,
  ) {}

  @Post()
  @RequirePermissions('student-period-component-scores.create')
  @ApiOperation({ summary: 'Create student period component score' })
  create(
    @Body() payload: CreateStudentPeriodComponentScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentPeriodComponentScoresService.create(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('student-period-component-scores.read')
  @ApiOperation({ summary: 'Get paginated student period component scores' })
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
    return this.studentPeriodComponentScoresService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-period-component-scores.read')
  @ApiOperation({ summary: 'Get student period component score by ID' })
  findOne(@Param('id') id: string) {
    return this.studentPeriodComponentScoresService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-period-component-scores.update')
  @ApiOperation({ summary: 'Update student period component score' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentPeriodComponentScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentPeriodComponentScoresService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('student-period-component-scores.delete')
  @ApiOperation({ summary: 'Soft delete student period component score' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentPeriodComponentScoresService.remove(id, user.userId);
  }
}
