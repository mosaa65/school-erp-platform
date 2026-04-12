import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ListAuditTrailDto } from './dto/list-audit-trail.dto';
import { AuditTrailService } from './audit-trail.service';

@ApiTags('Finance - Audit Trail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/audit-trail')
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()
  @RequirePermissions('audit-trail.read')
  @ApiOperation({ summary: 'Get paginated audit trail entries' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: ListAuditTrailDto) {
    return this.auditTrailService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('audit-trail.read')
  @ApiOperation({ summary: 'Get audit trail entry by ID' })
  findOne(@Param('id') id: string) {
    return this.auditTrailService.findOne(id);
  }
}
