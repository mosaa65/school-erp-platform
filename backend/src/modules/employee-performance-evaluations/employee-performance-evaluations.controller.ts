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
import { PerformanceRatingLevel } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateEmployeePerformanceEvaluationDto } from './dto/create-employee-performance-evaluation.dto';
import { ListEmployeePerformanceEvaluationsDto } from './dto/list-employee-performance-evaluations.dto';
import { UpdateEmployeePerformanceEvaluationDto } from './dto/update-employee-performance-evaluation.dto';
import { EmployeePerformanceEvaluationsService } from './employee-performance-evaluations.service';

@ApiTags('Employee Performance Evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-performance-evaluations')
export class EmployeePerformanceEvaluationsController {
  constructor(
    private readonly employeePerformanceEvaluationsService: EmployeePerformanceEvaluationsService,
  ) {}

  @Post()
  @RequirePermissions('employee-performance-evaluations.create')
  @ApiOperation({ summary: 'Create employee performance evaluation' })
  create(
    @Body() payload: CreateEmployeePerformanceEvaluationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeePerformanceEvaluationsService.create(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('employee-performance-evaluations.read')
  @ApiOperation({ summary: 'Get paginated employee performance evaluations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({
    name: 'ratingLevel',
    required: false,
    enum: PerformanceRatingLevel,
  })
  @ApiQuery({ name: 'evaluatorEmployeeId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeePerformanceEvaluationsDto) {
    return this.employeePerformanceEvaluationsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-performance-evaluations.read')
  @ApiOperation({ summary: 'Get employee performance evaluation by ID' })
  findOne(@Param('id') id: string) {
    return this.employeePerformanceEvaluationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-performance-evaluations.update')
  @ApiOperation({ summary: 'Update employee performance evaluation' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeePerformanceEvaluationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeePerformanceEvaluationsService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('employee-performance-evaluations.delete')
  @ApiOperation({ summary: 'Soft delete employee performance evaluation' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeePerformanceEvaluationsService.remove(id, user.userId);
  }
}
