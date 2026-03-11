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
import { TieBreakStrategy } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateGradingOutcomeRuleDto } from './dto/create-grading-outcome-rule.dto';
import { ListGradingOutcomeRulesDto } from './dto/list-grading-outcome-rules.dto';
import { UpdateGradingOutcomeRuleDto } from './dto/update-grading-outcome-rule.dto';
import { GradingOutcomeRulesService } from './grading-outcome-rules.service';

@ApiTags('Grading Outcome Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grading-outcome-rules')
export class GradingOutcomeRulesController {
  constructor(
    private readonly gradingOutcomeRulesService: GradingOutcomeRulesService,
  ) {}

  @Post()
  @RequirePermissions('grading-outcome-rules.create')
  @ApiOperation({
    summary:
      'Create grading outcome rule for one academic year and grade level',
  })
  create(
    @Body() payload: CreateGradingOutcomeRuleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradingOutcomeRulesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('grading-outcome-rules.read')
  @ApiOperation({ summary: 'Get paginated grading outcome rules' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({
    name: 'tieBreakStrategy',
    required: false,
    enum: TieBreakStrategy,
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListGradingOutcomeRulesDto) {
    return this.gradingOutcomeRulesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('grading-outcome-rules.read')
  @ApiOperation({ summary: 'Get grading outcome rule by ID' })
  findOne(@Param('id') id: string) {
    return this.gradingOutcomeRulesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('grading-outcome-rules.update')
  @ApiOperation({ summary: 'Update grading outcome rule' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateGradingOutcomeRuleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradingOutcomeRulesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('grading-outcome-rules.delete')
  @ApiOperation({ summary: 'Soft delete grading outcome rule' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gradingOutcomeRulesService.remove(id, user.userId);
  }
}
