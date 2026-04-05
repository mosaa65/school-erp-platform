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
import { CreateCreditDebitNoteDto } from './dto/create-credit-debit-note.dto';
import { ListCreditDebitNotesDto } from './dto/list-credit-debit-notes.dto';
import { UpdateCreditDebitNoteDto } from './dto/update-credit-debit-note.dto';
import { CreditDebitNotesService } from './credit-debit-notes.service';

@ApiTags('Finance - Credit/Debit Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/credit-debit-notes')
export class CreditDebitNotesController {
  constructor(private readonly creditDebitNotesService: CreditDebitNotesService) {}

  @Post()
  @RequirePermissions('credit-debit-notes.create')
  @ApiOperation({ summary: 'Create credit/debit note' })
  create(@Body() payload: CreateCreditDebitNoteDto, @CurrentUser() user: AuthUser) {
    return this.creditDebitNotesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('credit-debit-notes.read')
  @ApiOperation({ summary: 'Get paginated credit/debit notes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'noteType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'reason', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() query: ListCreditDebitNotesDto) {
    return this.creditDebitNotesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('credit-debit-notes.read')
  @ApiOperation({ summary: 'Get credit/debit note by ID' })
  findOne(@Param('id') id: string) {
    return this.creditDebitNotesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('credit-debit-notes.update')
  @ApiOperation({ summary: 'Update credit/debit note (DRAFT only)' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateCreditDebitNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.creditDebitNotesService.update(id, payload, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('credit-debit-notes.approve')
  @ApiOperation({ summary: 'Approve credit/debit note — DRAFT → APPROVED' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.creditDebitNotesService.approve(id, user.userId);
  }

  @Patch(':id/apply')
  @RequirePermissions('credit-debit-notes.apply')
  @ApiOperation({ summary: 'Apply credit/debit note — APPROVED → APPLIED (adjusts invoice)' })
  apply(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.creditDebitNotesService.apply(id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('credit-debit-notes.delete')
  @ApiOperation({ summary: 'Cancel credit/debit note (DRAFT only)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.creditDebitNotesService.remove(id, user.userId);
  }
}
