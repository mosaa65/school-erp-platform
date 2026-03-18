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
import { AssessmentType, GradingWorkflowStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateGradingPolicyDto } from './dto/create-grading-policy.dto';
import { ListGradingPoliciesDto } from './dto/list-grading-policies.dto';
import { UpdateGradingPolicyDto } from './dto/update-grading-policy.dto';
import { GradingPoliciesService } from './grading-policies.service';

@ApiTags('Grading Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grading-policies')
export class GradingPoliciesController {
  constructor(
    private readonly gradingPoliciesService: GradingPoliciesService,
  ) {}

  @Post()
  @RequirePermissions('grading-policies.create')
  @ApiOperation({ summary: 'Create grading policy' })
  create(
    @Body() payload: CreateGradingPolicyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradingPoliciesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('grading-policies.read')
  @ApiOperation({ summary: 'Get paginated grading policies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'assessmentType', required: false, enum: AssessmentType })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: GradingWorkflowStatus,
  })
  @ApiQuery({ name: 'isDefault', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListGradingPoliciesDto) {
    return this.gradingPoliciesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('grading-policies.read')
  @ApiOperation({ summary: 'Get grading policy by ID' })
  findOne(@Param('id') id: string) {
    return this.gradingPoliciesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('grading-policies.update')
  @ApiOperation({ summary: 'Update grading policy' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateGradingPolicyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gradingPoliciesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('grading-policies.delete')
  @ApiOperation({ summary: 'Soft delete grading policy' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gradingPoliciesService.remove(id, user.userId);
  }
}
