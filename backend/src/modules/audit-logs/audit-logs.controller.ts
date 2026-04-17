import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
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
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { RollbackAuditLogDto } from './dto/rollback-audit-log.dto';
import { UpdateAuditLogRetentionPolicyDto } from './dto/update-audit-log-retention-policy.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit-logs.read')
  @ApiOperation({ summary: 'Get paginated audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: ListAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get('retention-policy')
  @RequirePermissions('audit-logs.read')
  @ApiOperation({ summary: 'Get audit log retention policy' })
  getRetentionPolicy() {
    return this.auditLogsService.getRetentionPolicy();
  }

  @Patch('retention-policy')
  @RequirePermissions('audit-logs.update')
  @ApiOperation({ summary: 'Update audit log retention policy' })
  updateRetentionPolicy(
    @Body() payload: UpdateAuditLogRetentionPolicyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditLogsService.updateRetentionPolicy(payload, user.userId);
  }

  @Get(':id')
  @RequirePermissions('audit-logs.read')
  @ApiOperation({ summary: 'Get audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }

  @Get(':id/timeline')
  @RequirePermissions('audit-logs.read')
  @ApiOperation({ summary: 'Get last audit timeline changes for current entity' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum 10 changes',
  })
  findTimeline(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.auditLogsService.findTimelineByAuditLogId(id, parsedLimit);
  }

  @Post(':id/rollback')
  @RequirePermissions('audit-logs.update')
  @ApiOperation({
    summary:
      'Rollback audit timeline to the previous change or to a selected change within the latest 10 timeline records',
  })
  rollback(
    @Param('id') id: string,
    @Body() payload: RollbackAuditLogDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditLogsService.rollbackFromTimeline(id, user.userId, payload);
  }
}
