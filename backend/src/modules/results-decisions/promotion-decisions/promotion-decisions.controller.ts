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
import { CreatePromotionDecisionDto } from './dto/create-promotion-decision.dto';
import { ListPromotionDecisionsDto } from './dto/list-promotion-decisions.dto';
import { UpdatePromotionDecisionDto } from './dto/update-promotion-decision.dto';
import { PromotionDecisionsService } from './promotion-decisions.service';

@ApiTags('Promotion Decisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('promotion-decisions')
export class PromotionDecisionsController {
  constructor(
    private readonly promotionDecisionsService: PromotionDecisionsService,
  ) {}

  @Post()
  @RequirePermissions('promotion-decisions.create')
  @ApiOperation({ summary: 'Create promotion decision lookup item' })
  create(
    @Body() payload: CreatePromotionDecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.promotionDecisionsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('promotion-decisions.read')
  @ApiOperation({ summary: 'Get paginated promotion decisions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isSystem', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListPromotionDecisionsDto) {
    return this.promotionDecisionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('promotion-decisions.read')
  @ApiOperation({ summary: 'Get promotion decision by ID' })
  findOne(@Param('id') id: string) {
    return this.promotionDecisionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('promotion-decisions.update')
  @ApiOperation({ summary: 'Update promotion decision lookup item' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdatePromotionDecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.promotionDecisionsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('promotion-decisions.delete')
  @ApiOperation({ summary: 'Soft delete promotion decision lookup item' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.promotionDecisionsService.remove(id, user.userId);
  }
}
