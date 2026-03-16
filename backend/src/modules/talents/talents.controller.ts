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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateTalentDto } from './dto/create-talent.dto';
import { ListTalentsDto } from './dto/list-talents.dto';
import { UpdateTalentDto } from './dto/update-talent.dto';
import { TalentsService } from './talents.service';

@ApiTags('Talents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('talents')
export class TalentsController {
  constructor(private readonly talentsService: TalentsService) {}

  @Post()
  @RequirePermissions('talents.create')
  @ApiOperation({ summary: 'Create talent' })
  create(@Body() payload: CreateTalentDto, @CurrentUser() user: AuthUser) {
    return this.talentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('talents.read')
  @ApiOperation({ summary: 'Get paginated talents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListTalentsDto) {
    return this.talentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('talents.read')
  @ApiOperation({ summary: 'Get talent by ID' })
  findOne(@Param('id') id: string) {
    return this.talentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('talents.update')
  @ApiOperation({ summary: 'Update talent' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateTalentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.talentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('talents.delete')
  @ApiOperation({ summary: 'Soft delete talent' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.talentsService.remove(id, user.userId);
  }
}
