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
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { ListTimetableEntriesDto } from './dto/list-timetable-entries.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { TimetableEntriesService } from './timetable-entries.service';

@ApiTags('Timetable Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('timetable-entries')
export class TimetableEntriesController {
  constructor(
    private readonly timetableEntriesService: TimetableEntriesService,
  ) {}

  @Post()
  @RequirePermissions('timetable-entries.create')
  @ApiOperation({ summary: 'Create timetable entry' })
  create(
    @Body() payload: CreateTimetableEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timetableEntriesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('timetable-entries.read')
  @ApiOperation({ summary: 'Get paginated timetable entries' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'termSubjectOfferingId', required: false, type: String })
  @ApiQuery({ name: 'dayOfWeek', required: false, enum: TimetableDay })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListTimetableEntriesDto) {
    return this.timetableEntriesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('timetable-entries.read')
  @ApiOperation({ summary: 'Get timetable entry by ID' })
  findOne(@Param('id') id: string) {
    return this.timetableEntriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('timetable-entries.update')
  @ApiOperation({ summary: 'Update timetable entry' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateTimetableEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timetableEntriesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('timetable-entries.delete')
  @ApiOperation({ summary: 'Soft delete timetable entry' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.timetableEntriesService.remove(id, user.userId);
  }
}
