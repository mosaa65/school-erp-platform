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
import { CreateHomeworkTypeDto } from './dto/create-homework-type.dto';
import { ListHomeworkTypesDto } from './dto/list-homework-types.dto';
import { UpdateHomeworkTypeDto } from './dto/update-homework-type.dto';
import { HomeworkTypesService } from './homework-types.service';

@ApiTags('Homework Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('homework-types')
export class HomeworkTypesController {
  constructor(private readonly homeworkTypesService: HomeworkTypesService) {}

  @Post()
  @RequirePermissions('homework-types.create')
  @ApiOperation({ summary: 'Create homework type' })
  create(
    @Body() payload: CreateHomeworkTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkTypesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('homework-types.read')
  @ApiOperation({ summary: 'Get paginated homework types' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isSystem', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListHomeworkTypesDto) {
    return this.homeworkTypesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('homework-types.read')
  @ApiOperation({ summary: 'Get homework type by ID' })
  findOne(@Param('id') id: string) {
    return this.homeworkTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('homework-types.update')
  @ApiOperation({ summary: 'Update homework type' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateHomeworkTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkTypesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('homework-types.delete')
  @ApiOperation({ summary: 'Soft delete homework type' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.homeworkTypesService.remove(id, user.userId);
  }
}
