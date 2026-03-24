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
import { CreateSectionClassroomAssignmentDto } from './dto/create-section-classroom-assignment.dto';
import { ListSectionClassroomAssignmentsDto } from './dto/list-section-classroom-assignments.dto';
import { UpdateSectionClassroomAssignmentDto } from './dto/update-section-classroom-assignment.dto';
import { SectionClassroomAssignmentsService } from './section-classroom-assignments.service';

@ApiTags('Section Classroom Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('section-classroom-assignments')
export class SectionClassroomAssignmentsController {
  constructor(
    private readonly sectionClassroomAssignmentsService: SectionClassroomAssignmentsService,
  ) {}

  @Post()
  @RequirePermissions('sections.create')
  @ApiOperation({ summary: 'Create section classroom assignment' })
  create(
    @Body() payload: CreateSectionClassroomAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.sectionClassroomAssignmentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('sections.read')
  @ApiOperation({ summary: 'List section classroom assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'classroomId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isPrimary', required: false, type: Boolean })
  findAll(@Query() query: ListSectionClassroomAssignmentsDto) {
    return this.sectionClassroomAssignmentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('sections.read')
  @ApiOperation({ summary: 'Get section classroom assignment by ID' })
  findOne(@Param('id') id: string) {
    return this.sectionClassroomAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('sections.update')
  @ApiOperation({ summary: 'Update section classroom assignment' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateSectionClassroomAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.sectionClassroomAssignmentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('sections.delete')
  @ApiOperation({ summary: 'Soft delete section classroom assignment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sectionClassroomAssignmentsService.remove(id, user.userId);
  }
}
