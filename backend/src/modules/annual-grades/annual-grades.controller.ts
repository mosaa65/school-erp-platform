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
import { CreateAnnualGradeDto } from './dto/create-annual-grade.dto';
import { ListAnnualGradesDto } from './dto/list-annual-grades.dto';
import { UpdateAnnualGradeDto } from './dto/update-annual-grade.dto';
import { AnnualGradesService } from './annual-grades.service';

@ApiTags('Annual Grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('annual-grades')
export class AnnualGradesController {
  constructor(private readonly annualGradesService: AnnualGradesService) {}

  @Post()
  @RequirePermissions('annual-grades.create')
  @ApiOperation({
    summary: 'Create annual grade for one enrollment and subject',
  })
  create(@Body() payload: CreateAnnualGradeDto, @CurrentUser() user: AuthUser) {
    return this.annualGradesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('annual-grades.read')
  @ApiOperation({ summary: 'Get paginated annual grades' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'finalStatusId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAnnualGradesDto) {
    return this.annualGradesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('annual-grades.read')
  @ApiOperation({ summary: 'Get annual grade by ID' })
  findOne(@Param('id') id: string) {
    return this.annualGradesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('annual-grades.update')
  @ApiOperation({ summary: 'Update annual grade fields and metadata' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAnnualGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.annualGradesService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('annual-grades.lock')
  @ApiOperation({ summary: 'Lock annual grade and mark it approved' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualGradesService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('annual-grades.unlock')
  @ApiOperation({ summary: 'Unlock annual grade' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualGradesService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('annual-grades.delete')
  @ApiOperation({ summary: 'Soft delete annual grade' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualGradesService.remove(id, user.userId);
  }
}
