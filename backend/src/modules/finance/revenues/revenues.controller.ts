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
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { ListRevenuesDto } from './dto/list-revenues.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { RevenuesService } from './revenues.service';

@ApiTags('Finance - Revenues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/revenues')
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Post()
  @RequirePermissions('revenues.create')
  @ApiOperation({ summary: 'Create revenue entry (auto journal entry)' })
  create(@Body() payload: CreateRevenueDto, @CurrentUser() user: AuthUser) {
    return this.revenuesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('revenues.read')
  @ApiOperation({ summary: 'Get paginated revenues' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'fundId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'sourceType', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(@Query() query: ListRevenuesDto) {
    return this.revenuesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('revenues.read')
  @ApiOperation({ summary: 'Get revenue by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.revenuesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('revenues.update')
  @ApiOperation({ summary: 'Update revenue (before posting)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateRevenueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.revenuesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('revenues.delete')
  @ApiOperation({ summary: 'Delete revenue (only if not posted)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.revenuesService.remove(id, user.userId);
  }
}
