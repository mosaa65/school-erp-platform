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
import { TimetableDay } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateEmployeeTaskDto } from './dto/create-employee-task.dto';
import { ListEmployeeTasksDto } from './dto/list-employee-tasks.dto';
import { UpdateEmployeeTaskDto } from './dto/update-employee-task.dto';
import { EmployeeTasksService } from './employee-tasks.service';

@ApiTags('Employee Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-tasks')
export class EmployeeTasksController {
  constructor(private readonly employeeTasksService: EmployeeTasksService) {}

  @Post()
  @RequirePermissions('employee-tasks.create')
  @ApiOperation({ summary: 'Create employee task' })
  create(
    @Body() payload: CreateEmployeeTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeTasksService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-tasks.read')
  @ApiOperation({ summary: 'Get paginated employee tasks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'dayOfWeek', required: false, enum: TimetableDay })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeTasksDto) {
    return this.employeeTasksService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-tasks.read')
  @ApiOperation({ summary: 'Get employee task by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeTasksService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-tasks.update')
  @ApiOperation({ summary: 'Update employee task' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeTasksService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-tasks.delete')
  @ApiOperation({ summary: 'Soft delete employee task' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeTasksService.remove(id, user.userId);
  }
}
