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
import { CreateEmployeeSectionSupervisionDto } from './dto/create-employee-section-supervision.dto';
import { ListEmployeeSectionSupervisionsDto } from './dto/list-employee-section-supervisions.dto';
import { UpdateEmployeeSectionSupervisionDto } from './dto/update-employee-section-supervision.dto';
import { EmployeeSectionSupervisionsService } from './employee-section-supervisions.service';

@ApiTags('Employee Section Supervisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-section-supervisions')
export class EmployeeSectionSupervisionsController {
  constructor(
    private readonly employeeSectionSupervisionsService: EmployeeSectionSupervisionsService,
  ) {}

  @Post()
  @RequirePermissions('employee-section-supervisions.create')
  @ApiOperation({ summary: 'Create employee section supervision scope' })
  create(
    @Body() payload: CreateEmployeeSectionSupervisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeSectionSupervisionsService.create(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('employee-section-supervisions.read')
  @ApiOperation({ summary: 'Get paginated employee section supervisions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'canViewStudents', required: false, type: Boolean })
  @ApiQuery({ name: 'canManageHomeworks', required: false, type: Boolean })
  @ApiQuery({ name: 'canManageGrades', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeSectionSupervisionsDto) {
    return this.employeeSectionSupervisionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-section-supervisions.read')
  @ApiOperation({ summary: 'Get employee section supervision by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeSectionSupervisionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-section-supervisions.update')
  @ApiOperation({ summary: 'Update employee section supervision scope' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeSectionSupervisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeSectionSupervisionsService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('employee-section-supervisions.delete')
  @ApiOperation({ summary: 'Soft delete employee section supervision scope' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeSectionSupervisionsService.remove(id, user.userId);
  }
}
