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
import { CreateEmployeeCourseDto } from './dto/create-employee-course.dto';
import { ListEmployeeCoursesDto } from './dto/list-employee-courses.dto';
import { UpdateEmployeeCourseDto } from './dto/update-employee-course.dto';
import { EmployeeCoursesService } from './employee-courses.service';

@ApiTags('Employee Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-courses')
export class EmployeeCoursesController {
  constructor(
    private readonly employeeCoursesService: EmployeeCoursesService,
  ) {}

  @Post()
  @RequirePermissions('employee-courses.create')
  @ApiOperation({ summary: 'Create employee course' })
  create(
    @Body() payload: CreateEmployeeCourseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeCoursesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-courses.read')
  @ApiOperation({ summary: 'Get paginated employee courses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeCoursesDto) {
    return this.employeeCoursesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-courses.read')
  @ApiOperation({ summary: 'Get employee course by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeCoursesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-courses.update')
  @ApiOperation({ summary: 'Update employee course' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeCourseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeCoursesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-courses.delete')
  @ApiOperation({ summary: 'Soft delete employee course' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeCoursesService.remove(id, user.userId);
  }
}
