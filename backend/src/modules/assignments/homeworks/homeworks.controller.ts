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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { HomeworksDashboardDto } from './dto/homeworks-dashboard.dto';
import { HomeworkWorkflowActionDto } from './dto/homework-workflow-action.dto';
import { ListHomeworksDto } from './dto/list-homeworks.dto';
import { SendHomeworkNotificationsDto } from './dto/send-homework-notifications.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { HomeworksService } from './homeworks.service';

@ApiTags('Homeworks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('homeworks')
export class HomeworksController {
  constructor(private readonly homeworksService: HomeworksService) {}

  @Post()
  @RequirePermissions('homeworks.create')
  @ApiOperation({
    summary: 'Create homework and optionally auto-populate students',
  })
  create(@Body() payload: CreateHomeworkDto, @CurrentUser() user: AuthUser) {
    return this.homeworksService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('homeworks.read')
  @ApiOperation({ summary: 'Get paginated homework records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'homeworkTypeId', required: false, type: String })
  @ApiQuery({ name: 'fromHomeworkDate', required: false, type: String })
  @ApiQuery({ name: 'toHomeworkDate', required: false, type: String })
  @ApiQuery({ name: 'fromDueDate', required: false, type: String })
  @ApiQuery({ name: 'toDueDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListHomeworksDto, @CurrentUser() user: AuthUser) {
    return this.homeworksService.findAll(query, user.userId);
  }

  @Get('dashboard')
  @RequireAnyPermissions('homeworks.dashboard', 'homework-reports.read')
  @ApiOperation({ summary: 'Get homework dashboard indicators' })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  dashboard(
    @Query() query: HomeworksDashboardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworksService.dashboard(query, user.userId);
  }

  @Get(':id')
  @RequirePermissions('homeworks.read')
  @ApiOperation({ summary: 'Get homework by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.homeworksService.findOne(id, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('homeworks.update')
  @ApiOperation({ summary: 'Update homework' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateHomeworkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworksService.update(id, payload, user.userId);
  }

  @Post(':id/populate-students')
  @RequirePermissions('homeworks.populate-students')
  @ApiOperation({
    summary:
      'Populate missing student-homework records for active enrollments in the same section/year',
  })
  populateStudents(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.homeworksService.populateStudents(id, user.userId);
  }

  @Post(':id/approve')
  @RequirePermissions('homeworks.approve')
  @ApiOperation({ summary: 'Approve homework and optionally lock it' })
  approve(
    @Param('id') id: string,
    @Body() payload: HomeworkWorkflowActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworksService.approve(id, payload, user.userId);
  }

  @Post(':id/reopen')
  @RequirePermissions('homeworks.reopen')
  @ApiOperation({ summary: 'Reopen approved or locked homework for editing' })
  reopen(
    @Param('id') id: string,
    @Body() payload: HomeworkWorkflowActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworksService.reopen(id, payload, user.userId);
  }

  @Post(':id/send-late-notifications')
  @RequirePermissions('homework-notifications.send')
  @ApiOperation({
    summary: 'Create parent notifications for pending homework students',
  })
  sendLateNotifications(
    @Param('id') id: string,
    @Body() payload: SendHomeworkNotificationsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworksService.sendLateNotifications(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('homeworks.delete')
  @ApiOperation({
    summary: 'Soft delete homework and its student tracking rows',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.homeworksService.remove(id, user.userId);
  }
}
