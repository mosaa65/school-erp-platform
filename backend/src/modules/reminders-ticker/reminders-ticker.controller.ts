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
import { ReminderTickerType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateReminderTickerDto } from './dto/create-reminder-ticker.dto';
import { ListRemindersTickerDto } from './dto/list-reminders-ticker.dto';
import { UpdateReminderTickerDto } from './dto/update-reminder-ticker.dto';
import { RemindersTickerService } from './reminders-ticker.service';

@ApiTags('Reminders Ticker')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reminders-ticker')
export class RemindersTickerController {
  constructor(
    private readonly remindersTickerService: RemindersTickerService,
  ) {}

  @Post()
  @RequirePermissions('reminders-ticker.create')
  @ApiOperation({ summary: 'Create reminder ticker item' })
  create(
    @Body() payload: CreateReminderTickerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remindersTickerService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('reminders-ticker.read')
  @ApiOperation({ summary: 'Get paginated reminder ticker items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tickerType', required: false, enum: ReminderTickerType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListRemindersTickerDto) {
    return this.remindersTickerService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('reminders-ticker.read')
  @ApiOperation({ summary: 'Get reminder ticker item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.remindersTickerService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('reminders-ticker.update')
  @ApiOperation({ summary: 'Update reminder ticker item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateReminderTickerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remindersTickerService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('reminders-ticker.delete')
  @ApiOperation({ summary: 'Soft delete reminder ticker item' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.remindersTickerService.remove(id, user.userId);
  }
}
