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
import { CreateLookupEnrollmentStatusDto } from './dto/create-lookup-enrollment-status.dto';
import { ListLookupEnrollmentStatusesDto } from './dto/list-lookup-enrollment-statuses.dto';
import { UpdateLookupEnrollmentStatusDto } from './dto/update-lookup-enrollment-status.dto';
import { LookupEnrollmentStatusesService } from './lookup-enrollment-statuses.service';

@ApiTags('Lookup - Enrollment Statuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lookup/enrollment-statuses')
export class LookupEnrollmentStatusesController {
  constructor(
    private readonly lookupEnrollmentStatusesService: LookupEnrollmentStatusesService,
  ) {}

  @Post()
  @RequirePermissions('lookup-enrollment-statuses.create')
  @ApiOperation({ summary: 'Create Enrollment status lookup item' })
  create(
    @Body() payload: CreateLookupEnrollmentStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupEnrollmentStatusesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('lookup-enrollment-statuses.read')
  @ApiOperation({ summary: 'Get paginated Enrollment status lookup items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListLookupEnrollmentStatusesDto) {
    return this.lookupEnrollmentStatusesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('lookup-enrollment-statuses.read')
  @ApiOperation({ summary: 'Get Enrollment status lookup item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lookupEnrollmentStatusesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('lookup-enrollment-statuses.update')
  @ApiOperation({ summary: 'Update Enrollment status lookup item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateLookupEnrollmentStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lookupEnrollmentStatusesService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('lookup-enrollment-statuses.delete')
  @ApiOperation({ summary: 'Soft delete Enrollment status lookup item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.lookupEnrollmentStatusesService.remove(id, user.userId);
  }
}
