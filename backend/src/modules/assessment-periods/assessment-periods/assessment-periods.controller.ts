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
import { AssessmentPeriodCategory, GradingWorkflowStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { AssessmentPeriodsService } from './assessment-periods.service';
import { CreateAssessmentPeriodDto } from './dto/create-assessment-period.dto';
import { ListAssessmentPeriodsDto } from './dto/list-assessment-periods.dto';
import { UpdateAssessmentPeriodDto } from './dto/update-assessment-period.dto';

@ApiTags('Assessment Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('assessment-periods')
export class AssessmentPeriodsController {
  constructor(private readonly assessmentPeriodsService: AssessmentPeriodsService) {}

  @Post()
  @RequirePermissions('assessment-periods.create')
  @ApiOperation({ summary: 'Create assessment period' })
  create(
    @Body() payload: CreateAssessmentPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentPeriodsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('assessment-periods.read')
  @ApiOperation({ summary: 'Get paginated assessment periods' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'academicMonthId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: AssessmentPeriodCategory })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAssessmentPeriodsDto) {
    return this.assessmentPeriodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('assessment-periods.read')
  @ApiOperation({ summary: 'Get assessment period by ID' })
  findOne(@Param('id') id: string) {
    return this.assessmentPeriodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('assessment-periods.update')
  @ApiOperation({ summary: 'Update assessment period' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAssessmentPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentPeriodsService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('assessment-periods.lock')
  @ApiOperation({ summary: 'Lock assessment period and mark it approved' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentPeriodsService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('assessment-periods.unlock')
  @ApiOperation({ summary: 'Unlock assessment period' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentPeriodsService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('assessment-periods.delete')
  @ApiOperation({ summary: 'Soft delete assessment period' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentPeriodsService.remove(id, user.userId);
  }
}
