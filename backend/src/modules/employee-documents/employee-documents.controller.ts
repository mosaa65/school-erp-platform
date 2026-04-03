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
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';
import { GenerateEmployeeDocumentExpiryAlertsDto } from './dto/generate-employee-document-expiry-alerts.dto';
import { ListEmployeeDocumentsDto } from './dto/list-employee-documents.dto';
import { UpdateEmployeeDocumentDto } from './dto/update-employee-document.dto';
import { EmployeeDocumentsService } from './employee-documents.service';

@ApiTags('Employee Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-documents')
export class EmployeeDocumentsController {
  constructor(
    private readonly employeeDocumentsService: EmployeeDocumentsService,
  ) {}

  @Post()
  @RequirePermissions('employee-documents.create')
  @ApiOperation({ summary: 'Create employee document reference' })
  create(
    @Body() payload: CreateEmployeeDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeDocumentsService.create(payload, user.userId);
  }

  @Post('generate-expiry-alerts')
  @RequirePermissions('employee-documents.notify-expiring')
  @ApiOperation({ summary: 'Generate expiry alerts for employee documents nearing expiration' })
  generateExpiryAlerts(
    @Body() payload: GenerateEmployeeDocumentExpiryAlertsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeDocumentsService.generateExpiryAlerts(
      payload,
      user.userId,
    );
  }

  @Get()
  @RequirePermissions('employee-documents.read')
  @ApiOperation({ summary: 'Get paginated employee documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'fileCategory', required: false, type: String })
  @ApiQuery({ name: 'fileType', required: false, type: String })
  findAll(@Query() query: ListEmployeeDocumentsDto) {
    return this.employeeDocumentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-documents.read')
  @ApiOperation({ summary: 'Get employee document by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeDocumentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-documents.update')
  @ApiOperation({ summary: 'Update employee document reference' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeDocumentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-documents.delete')
  @ApiOperation({ summary: 'Soft delete employee document reference' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeDocumentsService.remove(id, user.userId);
  }
}
