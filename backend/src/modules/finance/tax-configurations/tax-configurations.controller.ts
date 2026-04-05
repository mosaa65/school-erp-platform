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
import { CreateTaxConfigurationDto } from './dto/create-tax-configuration.dto';
import { ListTaxConfigurationsDto } from './dto/list-tax-configurations.dto';
import { UpdateTaxConfigurationDto } from './dto/update-tax-configuration.dto';
import { TaxConfigurationsService } from './tax-configurations.service';

@ApiTags('Finance - Tax Configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/tax-configurations')
export class TaxConfigurationsController {
  constructor(
    private readonly taxConfigurationsService: TaxConfigurationsService,
  ) {}

  @Post()
  @RequirePermissions('tax-configurations.create')
  @ApiOperation({ summary: 'Create tax configuration' })
  create(
    @Body() payload: CreateTaxConfigurationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.taxConfigurationsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('tax-configurations.read')
  @ApiOperation({ summary: 'Get paginated tax configurations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'taxType', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListTaxConfigurationsDto) {
    return this.taxConfigurationsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('tax-configurations.read')
  @ApiOperation({ summary: 'Get tax configuration by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taxConfigurationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('tax-configurations.update')
  @ApiOperation({ summary: 'Update tax configuration' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateTaxConfigurationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.taxConfigurationsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('tax-configurations.delete')
  @ApiOperation({ summary: 'Soft delete tax configuration' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.taxConfigurationsService.remove(id, user.userId);
  }
}
