import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { CreateLookupGradeDescriptionDto } from './dto/create-lookup-grade-description.dto';
import { ListLookupGradeDescriptionsDto } from './dto/list-lookup-grade-descriptions.dto';
import { UpdateLookupGradeDescriptionDto } from './dto/update-lookup-grade-description.dto';
import { LookupGradeDescriptionsService } from './lookup-grade-descriptions.service';

@ApiTags('Lookup - Grade Descriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/grade-descriptions')
export class LookupGradeDescriptionsController {
  constructor(
    private readonly lookupGradeDescriptionsService: LookupGradeDescriptionsService,
  ) {}

  @Post()
  @RequirePermissions('lookup-grade-descriptions.create')
  @ApiOperation({ summary: 'Create grade description lookup item' })
  create(
    @Body() payload: CreateLookupGradeDescriptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupGradeDescriptionsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-grade-descriptions.read')
  @ApiOperation({ summary: 'Get paginated grade description lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupGradeDescriptionsDto) {
    return this.lookupGradeDescriptionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-grade-descriptions.read')
  @ApiOperation({ summary: 'Get grade description lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupGradeDescriptionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-grade-descriptions.update')
  @ApiOperation({ summary: 'Update grade description lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupGradeDescriptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupGradeDescriptionsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('lookup-grade-descriptions.delete')
  @ApiOperation({ summary: 'Soft delete grade description lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupGradeDescriptionsService.remove(id, user.userId);
  }
}
