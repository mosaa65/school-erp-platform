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
import { CreateSchoolProfileDto } from './dto/create-school-profile.dto';
import { ListSchoolProfilesDto } from './dto/list-school-profiles.dto';
import { UpdateSchoolProfileDto } from './dto/update-school-profile.dto';
import { SchoolProfilesService } from './school-profiles.service';

@ApiTags('School Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('school-profiles')
export class SchoolProfilesController {
  constructor(private readonly schoolProfilesService: SchoolProfilesService) {}

  @Post()
  @RequirePermissions('school-profiles.create')
  @ApiOperation({ summary: 'Create school profile' })
  create(
    @Body() payload: CreateSchoolProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schoolProfilesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('school-profiles.read')
  @ApiOperation({ summary: 'Get paginated school profiles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'ownershipTypeId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListSchoolProfilesDto) {
    return this.schoolProfilesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('school-profiles.read')
  @ApiOperation({ summary: 'Get school profile by ID' })
  findOne(@Param('id') id: string) {
    return this.schoolProfilesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('school-profiles.update')
  @ApiOperation({ summary: 'Update school profile' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateSchoolProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schoolProfilesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('school-profiles.delete')
  @ApiOperation({ summary: 'Soft delete school profile' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.schoolProfilesService.remove(id, user.userId);
  }
}
