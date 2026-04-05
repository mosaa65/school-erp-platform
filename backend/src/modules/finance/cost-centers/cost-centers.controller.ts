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
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { ListCostCentersDto } from './dto/list-cost-centers.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { CostCentersService } from './cost-centers.service';

@ApiTags('Finance - Cost Centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @RequirePermissions('cost-centers.create')
  @ApiOperation({ summary: 'Create cost center' })
  create(@Body() payload: CreateCostCenterDto, @CurrentUser() user: AuthUser) {
    return this.costCentersService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get paginated cost centers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findAll(@Query() query: ListCostCentersDto) {
    return this.costCentersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get cost center by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('cost-centers.update')
  @ApiOperation({ summary: 'Update cost center' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCostCenterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.costCentersService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('cost-centers.delete')
  @ApiOperation({ summary: 'Soft delete cost center' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.costCentersService.remove(id, user.userId);
  }
}
