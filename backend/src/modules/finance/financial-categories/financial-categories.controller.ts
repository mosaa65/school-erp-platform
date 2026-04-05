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
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { ListFinancialCategoriesDto } from './dto/list-financial-categories.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';
import { FinancialCategoriesService } from './financial-categories.service';

@ApiTags('Finance - Financial Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/financial-categories')
export class FinancialCategoriesController {
  constructor(private readonly financialCategoriesService: FinancialCategoriesService) {}

  @Post()
  @RequirePermissions('financial-categories.create')
  @ApiOperation({ summary: 'Create financial category' })
  create(
    @Body() payload: CreateFinancialCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financialCategoriesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('financial-categories.read')
  @ApiOperation({ summary: 'Get paginated financial categories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryType', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListFinancialCategoriesDto) {
    return this.financialCategoriesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('financial-categories.read')
  @ApiOperation({ summary: 'Get financial category by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.financialCategoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('financial-categories.update')
  @ApiOperation({ summary: 'Update financial category' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateFinancialCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financialCategoriesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('financial-categories.delete')
  @ApiOperation({ summary: 'Deactivate financial category' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.financialCategoriesService.remove(id, user.userId);
  }
}
