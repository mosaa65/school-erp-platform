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
import { CreateEmployeeDepartmentDto } from './dto/create-employee-department.dto';
import { ListEmployeeDepartmentsDto } from './dto/list-employee-departments.dto';
import { UpdateEmployeeDepartmentDto } from './dto/update-employee-department.dto';
import { EmployeeDepartmentsService } from './employee-departments.service';

@ApiTags('Employee Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-departments')
export class EmployeeDepartmentsController {
  constructor(
    private readonly employeeDepartmentsService: EmployeeDepartmentsService,
  ) {}

  @Post()
  @RequirePermissions('employee-departments.create')
  @ApiOperation({ summary: 'Create employee department' })
  create(
    @Body() payload: CreateEmployeeDepartmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeDepartmentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-departments.read')
  @ApiOperation({ summary: 'Get paginated employee departments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeDepartmentsDto) {
    return this.employeeDepartmentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-departments.read')
  @ApiOperation({ summary: 'Get employee department by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeDepartmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-departments.update')
  @ApiOperation({ summary: 'Update employee department' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeDepartmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeDepartmentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-departments.delete')
  @ApiOperation({ summary: 'Soft delete employee department' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeDepartmentsService.remove(id, user.userId);
  }
}
