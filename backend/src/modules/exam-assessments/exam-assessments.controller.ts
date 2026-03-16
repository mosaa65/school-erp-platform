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
import { CreateExamAssessmentDto } from './dto/create-exam-assessment.dto';
import { ListExamAssessmentsDto } from './dto/list-exam-assessments.dto';
import { UpdateExamAssessmentDto } from './dto/update-exam-assessment.dto';
import { ExamAssessmentsService } from './exam-assessments.service';

@ApiTags('Exam Assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('exam-assessments')
export class ExamAssessmentsController {
  constructor(
    private readonly examAssessmentsService: ExamAssessmentsService,
  ) {}

  @Post()
  @RequirePermissions('exam-assessments.create')
  @ApiOperation({ summary: 'Create exam assessment' })
  create(
    @Body() payload: CreateExamAssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.examAssessmentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('exam-assessments.read')
  @ApiOperation({ summary: 'Get paginated exam assessments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'examPeriodId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'fromExamDate', required: false, type: String })
  @ApiQuery({ name: 'toExamDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListExamAssessmentsDto) {
    return this.examAssessmentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('exam-assessments.read')
  @ApiOperation({ summary: 'Get exam assessment by ID' })
  findOne(@Param('id') id: string) {
    return this.examAssessmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('exam-assessments.update')
  @ApiOperation({ summary: 'Update exam assessment' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateExamAssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.examAssessmentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('exam-assessments.delete')
  @ApiOperation({ summary: 'Soft delete exam assessment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.examAssessmentsService.remove(id, user.userId);
  }
}
