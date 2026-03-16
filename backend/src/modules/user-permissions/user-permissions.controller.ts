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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateUserPermissionDto } from './dto/create-user-permission.dto';
import { ListUserPermissionsDto } from './dto/list-user-permissions.dto';
import { RevokeUserPermissionDto } from './dto/revoke-user-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { UserPermissionsService } from './user-permissions.service';

@ApiTags('User Direct Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('user-permissions')
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Post()
  @RequirePermissions('user-permissions.create')
  @ApiOperation({ summary: 'Create or re-grant user direct permission' })
  create(
    @Body() payload: CreateUserPermissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userPermissionsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('user-permissions.read')
  @ApiOperation({ summary: 'Get paginated user direct permissions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'permissionId', required: false, type: String })
  @ApiQuery({ name: 'isRevoked', required: false, type: Boolean })
  @ApiQuery({ name: 'isCurrent', required: false, type: Boolean })
  findAll(@Query() query: ListUserPermissionsDto) {
    return this.userPermissionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('user-permissions.read')
  @ApiOperation({ summary: 'Get user direct permission by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userPermissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('user-permissions.update')
  @ApiOperation({ summary: 'Update user direct permission' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateUserPermissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userPermissionsService.update(id, payload, user.userId);
  }

  @Post(':id/revoke')
  @RequirePermissions('user-permissions.revoke')
  @ApiOperation({ summary: 'Revoke user direct permission' })
  revoke(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RevokeUserPermissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userPermissionsService.revoke(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('user-permissions.delete')
  @ApiOperation({ summary: 'Soft delete user direct permission record' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.userPermissionsService.remove(id, user.userId);
  }
}
