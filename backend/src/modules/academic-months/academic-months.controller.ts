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
import { GradingWorkflowStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateAcademicMonthDto } from './dto/create-academic-month.dto';
import { ListAcademicMonthsDto } from './dto/list-academic-months.dto';
import { UpdateAcademicMonthDto } from './dto/update-academic-month.dto';
import { AcademicMonthsService } from './academic-months.service';

@ApiTags('Academic Months')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('academic-months')
export class AcademicMonthsController {
  constructor(private readonly academicMonthsService: AcademicMonthsService) {}

  @Post()
  @RequirePermissions('academic-months.create')
  @ApiOperation({ summary: 'Create academic month' })
  create(
    @Body() payload: CreateAcademicMonthDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.academicMonthsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('academic-months.read')
  @ApiOperation({ summary: 'Get paginated academic months' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicTermId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isCurrent', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAcademicMonthsDto) {
    return this.academicMonthsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('academic-months.read')
  @ApiOperation({ summary: 'Get academic month by ID' })
  findOne(@Param('id') id: string) {
    return this.academicMonthsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('academic-months.update')
  @ApiOperation({ summary: 'Update academic month' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAcademicMonthDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.academicMonthsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('academic-months.delete')
  @ApiOperation({ summary: 'Soft delete academic month' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.academicMonthsService.remove(id, user.userId);
  }
}
