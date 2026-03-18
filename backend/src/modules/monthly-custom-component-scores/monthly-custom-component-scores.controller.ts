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
import { CreateMonthlyCustomComponentScoreDto } from './dto/create-monthly-custom-component-score.dto';
import { ListMonthlyCustomComponentScoresDto } from './dto/list-monthly-custom-component-scores.dto';
import { UpdateMonthlyCustomComponentScoreDto } from './dto/update-monthly-custom-component-score.dto';
import { MonthlyCustomComponentScoresService } from './monthly-custom-component-scores.service';

@ApiTags('Monthly Custom Component Scores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monthly-custom-component-scores')
export class MonthlyCustomComponentScoresController {
  constructor(
    private readonly monthlyCustomComponentScoresService: MonthlyCustomComponentScoresService,
  ) {}

  @Post()
  @RequirePermissions('monthly-custom-component-scores.create')
  @ApiOperation({ summary: 'Create monthly custom component score' })
  create(
    @Body() payload: CreateMonthlyCustomComponentScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyCustomComponentScoresService.create(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('monthly-custom-component-scores.read')
  @ApiOperation({ summary: 'Get paginated monthly custom component scores' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'monthlyGradeId', required: false, type: String })
  @ApiQuery({ name: 'gradingPolicyComponentId', required: false, type: String })
  @ApiQuery({ name: 'academicMonthId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListMonthlyCustomComponentScoresDto) {
    return this.monthlyCustomComponentScoresService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('monthly-custom-component-scores.read')
  @ApiOperation({ summary: 'Get monthly custom component score by ID' })
  findOne(@Param('id') id: string) {
    return this.monthlyCustomComponentScoresService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('monthly-custom-component-scores.update')
  @ApiOperation({ summary: 'Update monthly custom component score' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateMonthlyCustomComponentScoreDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.monthlyCustomComponentScoresService.update(
      id,
      payload,
      user.userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('monthly-custom-component-scores.delete')
  @ApiOperation({ summary: 'Soft delete monthly custom component score' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.monthlyCustomComponentScoresService.remove(id, user.userId);
  }
}
