import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';
import { ListDiscountRulesDto } from './dto/list-discount-rules.dto';
import { UpdateDiscountRuleDto } from './dto/update-discount-rule.dto';
import { DiscountRulesService } from './discount-rules.service';

@ApiTags('Finance - Discount Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/discount-rules')
export class DiscountRulesController {
  constructor(private readonly discountRulesService: DiscountRulesService) {}

  @Post()
  @RequirePermissions('discount-rules.create')
  @ApiOperation({ summary: 'Create discount rule' })
  create(
    @Body() payload: CreateDiscountRuleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discountRulesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('discount-rules.read')
  @ApiOperation({ summary: 'Get paginated discount rules' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'discountType', required: false, type: String })
  @ApiQuery({ name: 'appliesToFeeType', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListDiscountRulesDto) {
    return this.discountRulesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('discount-rules.read')
  @ApiOperation({ summary: 'Get discount rule by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.discountRulesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('discount-rules.update')
  @ApiOperation({ summary: 'Update discount rule' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateDiscountRuleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discountRulesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('discount-rules.delete')
  @ApiOperation({ summary: 'Soft delete discount rule' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.discountRulesService.remove(id, user.userId);
  }
}
