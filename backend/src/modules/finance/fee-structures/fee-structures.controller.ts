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
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { ListFeeStructuresDto } from './dto/list-fee-structures.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { FeeStructuresService } from './fee-structures.service';

@ApiTags('Finance - Fee Structures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/fee-structures')
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Post()
  @RequirePermissions('fee-structures.create')
  @ApiOperation({ summary: 'Create fee structure' })
  create(
    @Body() payload: CreateFeeStructureDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.feeStructuresService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('fee-structures.read')
  @ApiOperation({ summary: 'Get paginated fee structures' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String })
  @ApiQuery({ name: 'feeType', required: false, type: String })
  @ApiQuery({ name: 'currencyId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListFeeStructuresDto) {
    return this.feeStructuresService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('fee-structures.read')
  @ApiOperation({ summary: 'Get fee structure by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feeStructuresService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('fee-structures.update')
  @ApiOperation({ summary: 'Update fee structure' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateFeeStructureDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.feeStructuresService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('fee-structures.delete')
  @ApiOperation({ summary: 'Soft delete fee structure' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.feeStructuresService.remove(id, user.userId);
  }
}
