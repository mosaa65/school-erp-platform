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
import { CreateEmployeeTalentDto } from './dto/create-employee-talent.dto';
import { ListEmployeeTalentsDto } from './dto/list-employee-talents.dto';
import { UpdateEmployeeTalentDto } from './dto/update-employee-talent.dto';
import { EmployeeTalentsService } from './employee-talents.service';

@ApiTags('Employee Talents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-talents')
export class EmployeeTalentsController {
  constructor(
    private readonly employeeTalentsService: EmployeeTalentsService,
  ) {}

  @Post()
  @RequirePermissions('employee-talents.create')
  @ApiOperation({ summary: 'Create employee-talent mapping' })
  create(
    @Body() payload: CreateEmployeeTalentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeTalentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('employee-talents.read')
  @ApiOperation({ summary: 'Get paginated employee-talent mappings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'talentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeTalentsDto) {
    return this.employeeTalentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-talents.read')
  @ApiOperation({ summary: 'Get employee-talent mapping by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeTalentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-talents.update')
  @ApiOperation({ summary: 'Update employee-talent mapping' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeTalentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeTalentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-talents.delete')
  @ApiOperation({ summary: 'Soft delete employee-talent mapping' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeTalentsService.remove(id, user.userId);
  }
}
