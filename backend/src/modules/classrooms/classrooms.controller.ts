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
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { ListClassroomsDto } from './dto/list-classrooms.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { ClassroomsService } from './classrooms.service';

@ApiTags('Classrooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @RequirePermissions('classrooms.create')
  @ApiOperation({ summary: 'Create classroom' })
  create(@Body() payload: CreateClassroomDto, @CurrentUser() user: AuthUser) {
    return this.classroomsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('classrooms.read')
  @ApiOperation({ summary: 'Get paginated classrooms' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'buildingLookupId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListClassroomsDto) {
    return this.classroomsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('classrooms.read')
  @ApiOperation({ summary: 'Get classroom by ID' })
  findOne(@Param('id') id: string) {
    return this.classroomsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('classrooms.update')
  @ApiOperation({ summary: 'Update classroom' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateClassroomDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.classroomsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('classrooms.delete')
  @ApiOperation({ summary: 'Soft delete classroom' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.classroomsService.remove(id, user.userId);
  }
}
