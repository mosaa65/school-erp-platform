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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { ListJournalEntriesDto } from './dto/list-journal-entries.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { JournalEntriesService } from './journal-entries.service';

@ApiTags('Finance - Journal Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Post()
  @RequirePermissions('journal-entries.create')
  @ApiOperation({ summary: 'Create journal entry' })
  create(
    @Body() payload: CreateJournalEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.journalEntriesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('journal-entries.read')
  @ApiOperation({ summary: 'Get paginated journal entries' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fiscalYearId', required: false, type: Number })
  @ApiQuery({ name: 'fiscalPeriodId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListJournalEntriesDto) {
    return this.journalEntriesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('journal-entries.read')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  findOne(@Param('id') id: string) {
    return this.journalEntriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('journal-entries.update')
  @ApiOperation({ summary: 'Update journal entry' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateJournalEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.journalEntriesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('journal-entries.delete')
  @ApiOperation({ summary: 'Soft delete journal entry' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.journalEntriesService.remove(id, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('journal-entries.update')
  @ApiOperation({ summary: 'Approve a DRAFT journal entry → APPROVED' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.journalEntriesService.approve(id, user.userId);
  }

  @Patch(':id/post')
  @RequirePermissions('journal-entries.update')
  @ApiOperation({ summary: 'Post an APPROVED journal entry → POSTED (updates account balances)' })
  postEntry(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.journalEntriesService.post(id, user.userId);
  }

  @Post(':id/reverse')
  @RequirePermissions('journal-entries.update')
  @ApiOperation({ summary: 'Reverse a POSTED journal entry (creates a mirror reversal entry)' })
  reverse(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.journalEntriesService.reverse(id, reason, user.userId);
  }
}

