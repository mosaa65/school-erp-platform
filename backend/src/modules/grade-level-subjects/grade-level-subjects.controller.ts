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
import { CreateGradeLevelSubjectDto } from './dto/create-grade-level-subject.dto';
import { ListGradeLevelSubjectsDto } from './dto/list-grade-level-subjects.dto';
import { UpdateGradeLevelSubjectDto } from './dto/update-grade-level-subject.dto';
import { GradeLevelSubjectsService } from './grade-level-subjects.service';

@ApiTags('Grade Level Subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grade-level-subjects')
export class GradeLevelSubjectsController {
  constructor(
    private readonly gradeLevelSubjectsService: GradeLevelSubjectsService,
  ) {}

  @Post()
  @RequirePermissions('grade-level-subjects.create')
  @ApiOperation({ summary: 'Create grade-level subject mapping' })
  create(
    @Body() payload: CreateGradeLevelSubjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradeLevelSubjectsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('grade-level-subjects.read')
  @ApiOperation({ summary: 'Get paginated grade-level subject mappings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'isMandatory', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListGradeLevelSubjectsDto) {
    return this.gradeLevelSubjectsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('grade-level-subjects.read')
  @ApiOperation({ summary: 'Get grade-level subject mapping by ID' })
  findOne(@Param('id') id: string) {
    return this.gradeLevelSubjectsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('grade-level-subjects.update')
  @ApiOperation({ summary: 'Update grade-level subject mapping' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateGradeLevelSubjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradeLevelSubjectsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('grade-level-subjects.delete')
  @ApiOperation({ summary: 'Soft delete grade-level subject mapping' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gradeLevelSubjectsService.remove(id, user.userId);
  }
}
