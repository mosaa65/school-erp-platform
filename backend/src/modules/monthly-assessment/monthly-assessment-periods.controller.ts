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
import { CreateAssessmentPeriodDto } from '../assessment-periods/assessment-periods/dto/create-assessment-period.dto';
import { ListAssessmentPeriodsDto } from '../assessment-periods/assessment-periods/dto/list-assessment-periods.dto';
import { UpdateAssessmentPeriodDto } from '../assessment-periods/assessment-periods/dto/update-assessment-period.dto';
import { MonthlyAssessmentPeriodsService } from './monthly-assessment-periods.service';

@ApiTags('Monthly Assessment Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monthly-assessment-periods')
export class MonthlyAssessmentPeriodsController {
  constructor(
    private readonly monthlyAssessmentPeriodsService: MonthlyAssessmentPeriodsService,
  ) {}

  @Post()
  @RequirePermissions('assessment-periods.create')
  @ApiOperation({ summary: 'Create monthly assessment period' })
  create(@Body() payload: CreateAssessmentPeriodDto, @CurrentUser() user: AuthUser) {
    return this.monthlyAssessmentPeriodsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('assessment-periods.read')
  @ApiOperation({ summary: 'Get paginated monthly assessment periods' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'academicMonthId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAssessmentPeriodsDto) {
    return this.monthlyAssessmentPeriodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('assessment-periods.read')
  @ApiOperation({ summary: 'Get monthly assessment period by ID' })
  findOne(@Param('id') id: string) {
    return this.monthlyAssessmentPeriodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('assessment-periods.update')
  @ApiOperation({ summary: 'Update monthly assessment period' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAssessmentPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyAssessmentPeriodsService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('assessment-periods.lock')
  @ApiOperation({ summary: 'Lock monthly assessment period' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyAssessmentPeriodsService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('assessment-periods.unlock')
  @ApiOperation({ summary: 'Unlock monthly assessment period' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyAssessmentPeriodsService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('assessment-periods.delete')
  @ApiOperation({ summary: 'Delete monthly assessment period' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyAssessmentPeriodsService.remove(id, user.userId);
  }
}
