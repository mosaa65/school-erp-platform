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
import {
  EnrollmentDistributionStatus,
  StudentEnrollmentStatus,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto';
import { ReturnStudentEnrollmentsToPendingDto } from './dto/return-student-enrollments-to-pending.dto';
import { ListStudentEnrollmentsDto } from './dto/list-student-enrollments.dto';
import { AutoDistributeStudentEnrollmentsDto } from './dto/auto-distribute-student-enrollments.dto';
import { ManualDistributeStudentEnrollmentsDto } from './dto/manual-distribute-student-enrollments.dto';
import { StudentEnrollmentDistributionBoardDto } from './dto/student-enrollment-distribution-board.dto';
import { TransferStudentEnrollmentsDto } from './dto/transfer-student-enrollments.dto';
import { UpdateStudentEnrollmentDto } from './dto/update-student-enrollment.dto';
import { StudentEnrollmentsService } from './student-enrollments.service';

@ApiTags('Student Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-enrollments')
export class StudentEnrollmentsController {
  constructor(
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  @Post()
  @RequirePermissions('student-enrollments.create')
  @ApiOperation({ summary: 'Create student enrollment' })
  create(
    @Body() payload: CreateStudentEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.create(payload, user.userId);
  }

  @Get()
  @RequireAnyPermissions(
    'student-enrollments.read',
    'student-enrollments.read.summary',
  )
  @ApiOperation({ summary: 'Get paginated student enrollments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StudentEnrollmentStatus,
  })
  @ApiQuery({
    name: 'distributionStatus',
    required: false,
    enum: EnrollmentDistributionStatus,
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortDirection',
    required: false,
    type: String,
  })
  findAll(@Query() query: ListStudentEnrollmentsDto) {
    return this.studentEnrollmentsService.findAll(query);
  }

  @Get('distribution/board')
  @RequireAnyPermissions(
    'student-enrollments.read',
    'student-enrollments.read.details',
  )
  @ApiOperation({ summary: 'Get student distribution board by year and grade' })
  findDistributionBoard(@Query() query: StudentEnrollmentDistributionBoardDto) {
    return this.studentEnrollmentsService.getDistributionBoard(query);
  }

  @Post('distribution/auto-assign')
  @RequirePermissions('student-enrollments.update')
  @ApiOperation({ summary: 'Automatically distribute pending student enrollments to sections' })
  autoDistribute(
    @Body() payload: AutoDistributeStudentEnrollmentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.autoDistribute(payload, user.userId);
  }

  @Post('distribution/manual-assign')
  @RequirePermissions('student-enrollments.update')
  @ApiOperation({ summary: 'Assign or transfer student enrollments to sections manually' })
  manualDistribute(
    @Body() payload: ManualDistributeStudentEnrollmentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.manualDistribute(payload, user.userId);
  }

  @Post('distribution/transfer-section')
  @RequirePermissions('student-enrollments.update')
  @ApiOperation({ summary: 'Transfer a full section or a selected enrollment set to another section' })
  transferSection(
    @Body() payload: TransferStudentEnrollmentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.transferSectionEnrollments(
      payload,
      user.userId,
    );
  }

  @Post('distribution/return-to-pending')
  @RequirePermissions('student-enrollments.update')
  @ApiOperation({ summary: 'Return one or more enrollments to pending distribution' })
  returnToPending(
    @Body() payload: ReturnStudentEnrollmentsToPendingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.returnEnrollmentsToPendingDistribution(
      payload,
      user.userId,
    );
  }

  @Get(':id')
  @RequireAnyPermissions(
    'student-enrollments.read',
    'student-enrollments.read.details',
  )
  @ApiOperation({ summary: 'Get student enrollment by ID' })
  findOne(@Param('id') id: string) {
    return this.studentEnrollmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-enrollments.update')
  @ApiOperation({ summary: 'Update student enrollment' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentEnrollmentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-enrollments.delete')
  @ApiOperation({ summary: 'Soft delete student enrollment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentEnrollmentsService.remove(id, user.userId);
  }
}
