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
import { ViolationSeverity } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateEmployeeViolationDto } from './dto/create-employee-violation.dto';
import { ListEmployeeViolationsDto } from './dto/list-employee-violations.dto';
import { UpdateEmployeeViolationDto } from './dto/update-employee-violation.dto';
import { EmployeeViolationsService } from './employee-violations.service';

@ApiTags('Employee Violations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-violations')
export class EmployeeViolationsController {
  constructor(
    private readonly employeeViolationsService: EmployeeViolationsService,
  ) {}

  @Post()
  @RequirePermissions('employee-violations.create')
  @ApiOperation({ summary: 'Create employee violation record' })
  create(
    @Body() payload: CreateEmployeeViolationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeViolationsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-violations.read')
  @ApiOperation({ summary: 'Get paginated employee violation records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'reportedByEmployeeId', required: false, type: String })
  @ApiQuery({ name: 'severity', required: false, enum: ViolationSeverity })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeViolationsDto) {
    return this.employeeViolationsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-violations.read')
  @ApiOperation({ summary: 'Get employee violation by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeViolationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-violations.update')
  @ApiOperation({ summary: 'Update employee violation record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeViolationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeViolationsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-violations.delete')
  @ApiOperation({ summary: 'Soft delete employee violation record' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeViolationsService.remove(id, user.userId);
  }
}
