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
import { CreateHomeworkTemplateDto } from './dto/create-homework-template.dto';
import { ListHomeworkTemplatesDto } from './dto/list-homework-templates.dto';
import { UpdateHomeworkTemplateDto } from './dto/update-homework-template.dto';
import { HomeworkTemplatesService } from './homework-templates.service';

@ApiTags('Homework Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('homework-templates')
export class HomeworkTemplatesController {
  constructor(
    private readonly homeworkTemplatesService: HomeworkTemplatesService,
  ) {}

  @Post()
  @RequirePermissions('homework-templates.create')
  @ApiOperation({ summary: 'Create homework template' })
  create(
    @Body() payload: CreateHomeworkTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkTemplatesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('homework-templates.read')
  @ApiOperation({ summary: 'Get paginated homework templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'homeworkTypeId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListHomeworkTemplatesDto) {
    return this.homeworkTemplatesService.findAll(query);
  }

  @Patch(':id')
  @RequirePermissions('homework-templates.update')
  @ApiOperation({ summary: 'Update homework template' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateHomeworkTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkTemplatesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('homework-templates.delete')
  @ApiOperation({ summary: 'Soft delete homework template' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.homeworkTemplatesService.remove(id, user.userId);
  }
}
