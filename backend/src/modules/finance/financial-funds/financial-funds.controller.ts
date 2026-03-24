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
import { CreateFinancialFundDto } from './dto/create-financial-fund.dto';
import { ListFinancialFundsDto } from './dto/list-financial-funds.dto';
import { UpdateFinancialFundDto } from './dto/update-financial-fund.dto';
import { FinancialFundsService } from './financial-funds.service';

@ApiTags('Finance - Financial Funds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/financial-funds')
export class FinancialFundsController {
  constructor(private readonly financialFundsService: FinancialFundsService) {}

  @Post()
  @RequirePermissions('financial-funds.create')
  @ApiOperation({ summary: 'Create financial fund' })
  create(@Body() payload: CreateFinancialFundDto, @CurrentUser() user: AuthUser) {
    return this.financialFundsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('financial-funds.read')
  @ApiOperation({ summary: 'Get paginated financial funds' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'fundType', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListFinancialFundsDto) {
    return this.financialFundsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('financial-funds.read')
  @ApiOperation({ summary: 'Get financial fund by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.financialFundsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('financial-funds.update')
  @ApiOperation({ summary: 'Update financial fund' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateFinancialFundDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financialFundsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('financial-funds.delete')
  @ApiOperation({ summary: 'Deactivate financial fund' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.financialFundsService.remove(id, user.userId);
  }
}
