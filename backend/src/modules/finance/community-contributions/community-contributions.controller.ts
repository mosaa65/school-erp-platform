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
import { CreateCommunityContributionDto } from './dto/create-community-contribution.dto';
import { ListCommunityContributionsDto } from './dto/list-community-contributions.dto';
import { UpdateCommunityContributionDto } from './dto/update-community-contribution.dto';
import { CommunityContributionsService } from './community-contributions.service';

@ApiTags('Finance - Community Contributions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/community-contributions')
export class CommunityContributionsController {
  constructor(
    private readonly communityContributionsService: CommunityContributionsService,
  ) {}

  @Post()
  @RequirePermissions('community-contributions.create')
  @ApiOperation({ summary: 'Create community contribution entry' })
  create(
    @Body() payload: CreateCommunityContributionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityContributionsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('community-contributions.read')
  @ApiOperation({ summary: 'Get paginated community contributions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'enrollmentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'semesterId', required: false, type: String })
  @ApiQuery({ name: 'monthId', required: false, type: String })
  @ApiQuery({ name: 'requiredAmountId', required: false, type: Number })
  @ApiQuery({ name: 'isExempt', required: false, type: Boolean })
  @ApiQuery({ name: 'recipientEmployeeId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(@Query() query: ListCommunityContributionsDto) {
    return this.communityContributionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('community-contributions.read')
  @ApiOperation({ summary: 'Get community contribution by ID' })
  findOne(@Param('id') id: string) {
    return this.communityContributionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('community-contributions.update')
  @ApiOperation({ summary: 'Update community contribution entry' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateCommunityContributionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityContributionsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('community-contributions.delete')
  @ApiOperation({ summary: 'Delete community contribution entry' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.communityContributionsService.remove(id, user.userId);
  }
}
