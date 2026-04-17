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
import { AssessmentComponentEntryMode } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateAssessmentPeriodComponentDto } from '../assessment-periods/assessment-period-components/dto/create-assessment-period-component.dto';
import { ListAssessmentPeriodComponentsDto } from '../assessment-periods/assessment-period-components/dto/list-assessment-period-components.dto';
import { UpdateAssessmentPeriodComponentDto } from '../assessment-periods/assessment-period-components/dto/update-assessment-period-component.dto';
import { MonthlyAssessmentComponentsService } from './monthly-assessment-components.service';

@ApiTags('Monthly Assessment Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monthly-assessment-components')
export class MonthlyAssessmentComponentsController {
  constructor(
    private readonly monthlyAssessmentComponentsService: MonthlyAssessmentComponentsService,
  ) {}

  @Post()
  @RequirePermissions('assessment-period-components.create')
  @ApiOperation({ summary: 'Create monthly assessment component' })
  create(@Body() payload: CreateAssessmentPeriodComponentDto, @CurrentUser() user: AuthUser) {
    return this.monthlyAssessmentComponentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('assessment-period-components.read')
  @ApiOperation({ summary: 'Get paginated monthly assessment components' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'assessmentPeriodId', required: false, type: String })
  @ApiQuery({ name: 'entryMode', required: false, enum: AssessmentComponentEntryMode })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAssessmentPeriodComponentsDto) {
    return this.monthlyAssessmentComponentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('assessment-period-components.read')
  @ApiOperation({ summary: 'Get monthly assessment component by ID' })
  findOne(@Param('id') id: string) {
    return this.monthlyAssessmentComponentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('assessment-period-components.update')
  @ApiOperation({ summary: 'Update monthly assessment component' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAssessmentPeriodComponentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyAssessmentComponentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('assessment-period-components.delete')
  @ApiOperation({ summary: 'Delete monthly assessment component' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyAssessmentComponentsService.remove(id, user.userId);
  }
}
