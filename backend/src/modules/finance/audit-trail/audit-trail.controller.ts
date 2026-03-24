import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateAuditTrailDto } from './dto/create-audit-trail.dto';
import { ListAuditTrailDto } from './dto/list-audit-trail.dto';
import { UpdateAuditTrailDto } from './dto/update-audit-trail.dto';
import { AuditTrailService } from './audit-trail.service';

@ApiTags('Finance - Audit Trail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/audit-trail')
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Post()
  @RequirePermissions('audit-trail.create')
  @ApiOperation({ summary: 'Create audit trail entry manually' })
  create(
    @Body() payload: CreateAuditTrailDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.auditTrailService.create(
      payload,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

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

  @Patch(':id')
  @RequirePermissions('audit-trail.update')
  @ApiOperation({ summary: 'Update audit trail entry' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAuditTrailDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditTrailService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('audit-trail.delete')
  @ApiOperation({ summary: 'Delete audit trail entry' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.auditTrailService.remove(id, user.userId);
  }
}
