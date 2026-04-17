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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { AssessmentPeriodComponentsService } from './assessment-period-components.service';
import { CreateAssessmentPeriodComponentDto } from './dto/create-assessment-period-component.dto';
import { ListAssessmentPeriodComponentsDto } from './dto/list-assessment-period-components.dto';
import { UpdateAssessmentPeriodComponentDto } from './dto/update-assessment-period-component.dto';

@ApiTags('Assessment Period Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('assessment-period-components')
export class AssessmentPeriodComponentsController {
  constructor(
    private readonly assessmentPeriodComponentsService: AssessmentPeriodComponentsService,
  ) {}

  @Post()
  @RequirePermissions('assessment-period-components.create')
  @ApiOperation({ summary: 'Create assessment period component' })
  create(
    @Body() payload: CreateAssessmentPeriodComponentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentPeriodComponentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('assessment-period-components.read')
  @ApiOperation({ summary: 'Get paginated assessment period components' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'assessmentPeriodId', required: false, type: String })
  @ApiQuery({ name: 'entryMode', required: false, enum: AssessmentComponentEntryMode })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAssessmentPeriodComponentsDto) {
    return this.assessmentPeriodComponentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('assessment-period-components.read')
  @ApiOperation({ summary: 'Get assessment period component by ID' })
  findOne(@Param('id') id: string) {
    return this.assessmentPeriodComponentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('assessment-period-components.update')
  @ApiOperation({ summary: 'Update assessment period component' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAssessmentPeriodComponentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentPeriodComponentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('assessment-period-components.delete')
  @ApiOperation({ summary: 'Soft delete assessment period component' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentPeriodComponentsService.remove(id, user.userId);
  }
}
