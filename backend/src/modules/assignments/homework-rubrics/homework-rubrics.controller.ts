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
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import {
  HOMEWORK_RUBRIC_DIFFICULTIES,
  CreateHomeworkRubricDto,
} from './dto/create-homework-rubric.dto';
import { ListHomeworkRubricsDto } from './dto/list-homework-rubrics.dto';
import { UpdateHomeworkRubricDto } from './dto/update-homework-rubric.dto';
import { HomeworkRubricsService } from './homework-rubrics.service';

@ApiTags('Homework Rubrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('homework-rubrics')
export class HomeworkRubricsController {
  constructor(private readonly homeworkRubricsService: HomeworkRubricsService) {}

  @Post()
  @RequirePermissions('homework-rubrics.create')
  @ApiOperation({ summary: 'Create homework rubric' })
  create(
    @Body() payload: CreateHomeworkRubricDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkRubricsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('homework-rubrics.read')
  @ApiOperation({ summary: 'Get paginated homework rubrics' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'homeworkTypeId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: HOMEWORK_RUBRIC_DIFFICULTIES,
  })
  @ApiQuery({ name: 'isSystem', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListHomeworkRubricsDto) {
    return this.homeworkRubricsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('homework-rubrics.read')
  @ApiOperation({ summary: 'Get homework rubric by ID' })
  findOne(@Param('id') id: string) {
    return this.homeworkRubricsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('homework-rubrics.update')
  @ApiOperation({ summary: 'Update homework rubric' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateHomeworkRubricDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkRubricsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('homework-rubrics.delete')
  @ApiOperation({ summary: 'Soft delete homework rubric' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.homeworkRubricsService.remove(id, user.userId);
  }
}
