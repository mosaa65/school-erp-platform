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
import { CreateBranchDto } from './dto/create-branch.dto';
import { ListBranchesDto } from './dto/list-branches.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchesService } from './branches.service';

@ApiTags('Finance - Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('branches.create')
  @ApiOperation({ summary: 'Create branch' })
  create(@Body() payload: CreateBranchDto, @CurrentUser() user: AuthUser) {
    return this.branchesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'Get paginated branches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isHeadquarters', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListBranchesDto) {
    return this.branchesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'Get branch by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Update branch' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateBranchDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.branchesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('branches.delete')
  @ApiOperation({ summary: 'Soft delete branch' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.branchesService.remove(id, user.userId);
  }
}
