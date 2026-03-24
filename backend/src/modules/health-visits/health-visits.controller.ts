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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateHealthVisitDto } from './dto/create-health-visit.dto';
import { ListHealthVisitsDto } from './dto/list-health-visits.dto';
import { UpdateHealthVisitDto } from './dto/update-health-visit.dto';
import { HealthVisitsService } from './health-visits.service';

@ApiTags('System 19 - Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('health')
export class HealthVisitsController {
  constructor(private readonly healthVisitsService: HealthVisitsService) {}

  @Post('visits')
  @RequirePermissions('health-visits.create')
  @ApiOperation({ summary: 'Log a health visit for a student' })
  create(@Body() payload: CreateHealthVisitDto, @CurrentUser() user: AuthUser) {
    return this.healthVisitsService.create(payload, user.userId);
  }

  @Get('visits')
  @RequirePermissions('health-visits.read')
  @ApiOperation({ summary: 'List health visits' })
  findAll(@Query() query: ListHealthVisitsDto) {
    return this.healthVisitsService.findAll(query);
  }

  @Get('visits/:id')
  @RequirePermissions('health-visits.read')
  @ApiOperation({ summary: 'Get a health visit by ID' })
  findOne(@Param('id') id: string) {
    return this.healthVisitsService.findOne(id);
  }

  @Patch('visits/:id')
  @RequirePermissions('health-visits.update')
  @ApiOperation({ summary: 'Update a health visit record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateHealthVisitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.healthVisitsService.update(id, payload, user.userId);
  }

  @Delete('visits/:id')
  @RequirePermissions('health-visits.delete')
  @ApiOperation({ summary: 'Soft delete a health visit' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.healthVisitsService.remove(id, user.userId);
  }

  @Get('summary')
  @RequirePermissions('health-visits.read')
  @ApiOperation({ summary: 'Get health visit summary' })
  summary() {
    return this.healthVisitsService.summary();
  }
}
