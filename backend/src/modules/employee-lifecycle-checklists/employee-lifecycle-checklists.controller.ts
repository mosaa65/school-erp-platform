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
import { CreateEmployeeLifecycleChecklistDto } from './dto/create-employee-lifecycle-checklist.dto';
import { GenerateEmployeeLifecycleChecklistDueAlertsDto } from './dto/generate-employee-lifecycle-checklist-due-alerts.dto';
import { GenerateEmployeeLifecycleChecklistTemplatesDto } from './dto/generate-employee-lifecycle-checklist-templates.dto';
import { ListEmployeeLifecycleChecklistsDto } from './dto/list-employee-lifecycle-checklists.dto';
import { UpdateEmployeeLifecycleChecklistDto } from './dto/update-employee-lifecycle-checklist.dto';
import { EmployeeLifecycleChecklistsService } from './employee-lifecycle-checklists.service';

@ApiTags('Employee Lifecycle Checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-lifecycle-checklists')
export class EmployeeLifecycleChecklistsController {
  constructor(
    private readonly employeeLifecycleChecklistsService: EmployeeLifecycleChecklistsService,
  ) {}

  @Post()
  @RequirePermissions('employee-lifecycle-checklists.create')
  @ApiOperation({ summary: 'Create employee lifecycle checklist item' })
  create(
    @Body() payload: CreateEmployeeLifecycleChecklistDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLifecycleChecklistsService.create(payload, user.userId);
  }

  @Post('generate-templates')
  @RequirePermissions('employee-lifecycle-checklists.create')
  @ApiOperation({
    summary: 'Generate built-in onboarding or offboarding checklist items',
  })
  generateTemplates(
    @Body() payload: GenerateEmployeeLifecycleChecklistTemplatesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLifecycleChecklistsService.generateTemplates(
      payload,
      user.userId,
    );
  }

  @Post('generate-due-alerts')
  @RequirePermissions('employee-lifecycle-checklists.notify-due')
  @ApiOperation({ summary: 'Generate due and overdue lifecycle checklist alerts' })
  generateDueAlerts(
    @Body() payload: GenerateEmployeeLifecycleChecklistDueAlertsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLifecycleChecklistsService.generateDueAlerts(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('employee-lifecycle-checklists.read')
  @ApiOperation({ summary: 'Get paginated lifecycle checklist items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'assignedToEmployeeId', required: false, type: String })
  @ApiQuery({ name: 'checklistType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dueDateFrom', required: false, type: String })
  @ApiQuery({ name: 'dueDateTo', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeLifecycleChecklistsDto) {
    return this.employeeLifecycleChecklistsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-lifecycle-checklists.read')
  @ApiOperation({ summary: 'Get lifecycle checklist item by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeLifecycleChecklistsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-lifecycle-checklists.update')
  @ApiOperation({ summary: 'Update lifecycle checklist item' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeLifecycleChecklistDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeLifecycleChecklistsService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Patch(':id/start')
  @RequirePermissions('employee-lifecycle-checklists.transition')
  @ApiOperation({ summary: 'Start lifecycle checklist item workflow' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLifecycleChecklistsService.start(id, user.userId);
  }

  @Patch(':id/complete')
  @RequirePermissions('employee-lifecycle-checklists.transition')
  @ApiOperation({ summary: 'Complete lifecycle checklist item workflow' })
  complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLifecycleChecklistsService.complete(id, user.userId);
  }

  @Patch(':id/waive')
  @RequirePermissions('employee-lifecycle-checklists.transition')
  @ApiOperation({ summary: 'Waive lifecycle checklist item workflow' })
  waive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLifecycleChecklistsService.waive(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-lifecycle-checklists.delete')
  @ApiOperation({ summary: 'Soft delete lifecycle checklist item' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeLifecycleChecklistsService.remove(id, user.userId);
  }
}
