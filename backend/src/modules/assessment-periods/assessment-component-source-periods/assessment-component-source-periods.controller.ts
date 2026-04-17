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
import { AssessmentComponentSourcePeriodsService } from './assessment-component-source-periods.service';
import { CreateAssessmentComponentSourcePeriodDto } from './dto/create-assessment-component-source-period.dto';
import { ListAssessmentComponentSourcePeriodsDto } from './dto/list-assessment-component-source-periods.dto';
import { UpdateAssessmentComponentSourcePeriodDto } from './dto/update-assessment-component-source-period.dto';

@ApiTags('Assessment Component Source Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('assessment-component-source-periods')
export class AssessmentComponentSourcePeriodsController {
  constructor(
    private readonly assessmentComponentSourcePeriodsService: AssessmentComponentSourcePeriodsService,
  ) {}

  @Post()
  @RequirePermissions('assessment-component-source-periods.create')
  @ApiOperation({ summary: 'Create assessment component source period' })
  create(
    @Body() payload: CreateAssessmentComponentSourcePeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentComponentSourcePeriodsService.create(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('assessment-component-source-periods.read')
  @ApiOperation({ summary: 'Get paginated assessment component source periods' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'assessmentPeriodComponentId', required: false, type: String })
  @ApiQuery({ name: 'sourcePeriodId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAssessmentComponentSourcePeriodsDto) {
    return this.assessmentComponentSourcePeriodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('assessment-component-source-periods.read')
  @ApiOperation({ summary: 'Get assessment component source period by ID' })
  findOne(@Param('id') id: string) {
    return this.assessmentComponentSourcePeriodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('assessment-component-source-periods.update')
  @ApiOperation({ summary: 'Update assessment component source period' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAssessmentComponentSourcePeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentComponentSourcePeriodsService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('assessment-component-source-periods.delete')
  @ApiOperation({ summary: 'Soft delete assessment component source period' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentComponentSourcePeriodsService.remove(id, user.userId);
  }
}
