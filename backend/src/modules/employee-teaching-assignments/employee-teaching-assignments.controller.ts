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
import { CreateEmployeeTeachingAssignmentDto } from './dto/create-employee-teaching-assignment.dto';
import { ListEmployeeTeachingAssignmentsDto } from './dto/list-employee-teaching-assignments.dto';
import { UpdateEmployeeTeachingAssignmentDto } from './dto/update-employee-teaching-assignment.dto';
import { EmployeeTeachingAssignmentsService } from './employee-teaching-assignments.service';

@ApiTags('Employee Teaching Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-teaching-assignments')
export class EmployeeTeachingAssignmentsController {
  constructor(
    private readonly employeeTeachingAssignmentsService: EmployeeTeachingAssignmentsService,
  ) {}

  @Post()
  @RequirePermissions('employee-teaching-assignments.create')
  @ApiOperation({ summary: 'Create employee teaching assignment' })
  create(
    @Body() payload: CreateEmployeeTeachingAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeTeachingAssignmentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-teaching-assignments.read')
  @ApiOperation({ summary: 'Get paginated employee teaching assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeTeachingAssignmentsDto) {
    return this.employeeTeachingAssignmentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-teaching-assignments.read')
  @ApiOperation({ summary: 'Get employee teaching assignment by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeTeachingAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-teaching-assignments.update')
  @ApiOperation({ summary: 'Update employee teaching assignment' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeTeachingAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeTeachingAssignmentsService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('employee-teaching-assignments.delete')
  @ApiOperation({ summary: 'Soft delete employee teaching assignment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeTeachingAssignmentsService.remove(id, user.userId);
  }
}
