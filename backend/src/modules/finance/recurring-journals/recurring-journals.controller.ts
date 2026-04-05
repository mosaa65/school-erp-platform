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
import { CreateRecurringJournalDto } from './dto/create-recurring-journal.dto';
import { ListRecurringJournalsDto } from './dto/list-recurring-journals.dto';
import { UpdateRecurringJournalDto } from './dto/update-recurring-journal.dto';
import { RecurringJournalsService } from './recurring-journals.service';

@ApiTags('Finance - Recurring Journals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/recurring-journals')
export class RecurringJournalsController {
  constructor(
    private readonly recurringJournalsService: RecurringJournalsService,
  ) {}

  @Post()
  @RequirePermissions('recurring-journals.create')
  @ApiOperation({ summary: 'Create recurring journal template' })
  create(@Body() payload: CreateRecurringJournalDto, @CurrentUser() user: AuthUser) {
    return this.recurringJournalsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('recurring-journals.read')
  @ApiOperation({ summary: 'Get paginated recurring journal templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'frequency', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListRecurringJournalsDto) {
    return this.recurringJournalsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('recurring-journals.read')
  @ApiOperation({ summary: 'Get recurring journal template by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recurringJournalsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('recurring-journals.update')
  @ApiOperation({ summary: 'Update recurring journal template' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateRecurringJournalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recurringJournalsService.update(id, payload, user.userId);
  }

  @Post(':id/generate')
  @RequirePermissions('recurring-journals.generate')
  @ApiOperation({ summary: 'Generate journal entry from template' })
  generate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recurringJournalsService.generate(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('recurring-journals.delete')
  @ApiOperation({ summary: 'Deactivate recurring journal template' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recurringJournalsService.remove(id, user.userId);
  }
}
