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
import { AssessmentType, GradingWorkflowStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateExamPeriodDto } from './dto/create-exam-period.dto';
import { ListExamPeriodsDto } from './dto/list-exam-periods.dto';
import { UpdateExamPeriodDto } from './dto/update-exam-period.dto';
import { ExamPeriodsService } from './exam-periods.service';

@ApiTags('Exam Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('exam-periods')
export class ExamPeriodsController {
  constructor(private readonly examPeriodsService: ExamPeriodsService) {}

  @Post()
  @RequirePermissions('exam-periods.create')
  @ApiOperation({ summary: 'Create exam period' })
  create(@Body() payload: CreateExamPeriodDto, @CurrentUser() user: AuthUser) {
    return this.examPeriodsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('exam-periods.read')
  @ApiOperation({ summary: 'Get paginated exam periods' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'assessmentType', required: false, enum: AssessmentType })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: GradingWorkflowStatus,
  })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListExamPeriodsDto) {
    return this.examPeriodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('exam-periods.read')
  @ApiOperation({ summary: 'Get exam period by ID' })
  findOne(@Param('id') id: string) {
    return this.examPeriodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('exam-periods.update')
  @ApiOperation({ summary: 'Update exam period' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateExamPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.examPeriodsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('exam-periods.delete')
  @ApiOperation({ summary: 'Soft delete exam period' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.examPeriodsService.remove(id, user.userId);
  }
}
