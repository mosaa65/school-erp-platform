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
import { StudentGender } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { ListGuardiansDto } from './dto/list-guardians.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { GuardiansService } from './guardians.service';

@ApiTags('Guardians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Post()
  @RequirePermissions('guardians.create')
  @ApiOperation({ summary: 'Create guardian profile' })
  create(@Body() payload: CreateGuardianDto, @CurrentUser() user: AuthUser) {
    return this.guardiansService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('guardians.read')
  @ApiOperation({ summary: 'Get paginated guardians' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'gender', required: false, enum: StudentGender })
  @ApiQuery({ name: 'idTypeId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListGuardiansDto) {
    return this.guardiansService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('guardians.read')
  @ApiOperation({ summary: 'Get guardian by ID' })
  findOne(@Param('id') id: string) {
    return this.guardiansService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('guardians.update')
  @ApiOperation({ summary: 'Update guardian profile' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateGuardianDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.guardiansService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('guardians.delete')
  @ApiOperation({ summary: 'Soft delete guardian profile' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.guardiansService.remove(id, user.userId);
  }
}
