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
import { AnnualResultsService } from './annual-results.service';
import { CalculateAnnualResultsDto } from './dto/calculate-annual-results.dto';
import { CreateAnnualResultDto } from './dto/create-annual-result.dto';
import { ListAnnualResultsDto } from './dto/list-annual-results.dto';
import { UpdateAnnualResultDto } from './dto/update-annual-result.dto';

@ApiTags('Annual Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('annual-results')
export class AnnualResultsController {
  constructor(private readonly annualResultsService: AnnualResultsService) {}

  @Post()
  @RequirePermissions('annual-results.create')
  @ApiOperation({ summary: 'Create annual result for one enrollment' })
  create(
    @Body() payload: CreateAnnualResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.annualResultsService.create(payload, user.userId);
  }

  @Post('calculate')
  @RequirePermissions('annual-results.calculate')
  @ApiOperation({
    summary:
      'Calculate annual grades and annual results with promotion decision and ranking',
  })
  calculate(
    @Body() payload: CalculateAnnualResultsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.annualResultsService.calculate(payload, user.userId);
  }

  @Get()
  @RequirePermissions('annual-results.read')
  @ApiOperation({ summary: 'Get paginated annual results' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'promotionDecisionId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GradingWorkflowStatus })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListAnnualResultsDto) {
    return this.annualResultsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('annual-results.read')
  @ApiOperation({ summary: 'Get annual result by ID' })
  findOne(@Param('id') id: string) {
    return this.annualResultsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('annual-results.update')
  @ApiOperation({ summary: 'Update annual result fields and metadata' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAnnualResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.annualResultsService.update(id, payload, user.userId);
  }

  @Post(':id/lock')
  @RequirePermissions('annual-results.lock')
  @ApiOperation({ summary: 'Lock annual result and mark it approved' })
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualResultsService.lock(id, user.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('annual-results.unlock')
  @ApiOperation({ summary: 'Unlock annual result' })
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualResultsService.unlock(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('annual-results.delete')
  @ApiOperation({ summary: 'Soft delete annual result' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annualResultsService.remove(id, user.userId);
  }
}
