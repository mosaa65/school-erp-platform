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
import { EmployeeGender, EmploymentType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Create employee profile' })
  create(@Body() payload: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.employeesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Get paginated employees' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'gender', required: false, enum: EmployeeGender })
  @ApiQuery({ name: 'genderId', required: false, type: Number })
  @ApiQuery({ name: 'employmentType', required: false, enum: EmploymentType })
  @ApiQuery({ name: 'idTypeId', required: false, type: Number })
  @ApiQuery({ name: 'localityId', required: false, type: Number })
  @ApiQuery({ name: 'jobTitle', required: false, type: String })
  @ApiQuery({ name: 'qualificationId', required: false, type: Number })
  @ApiQuery({ name: 'jobRoleId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeesDto) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Update employee profile' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employees.delete')
  @ApiOperation({ summary: 'Soft delete employee profile' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeesService.remove(id, user.userId);
  }
}
