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
import { CreateEmployeeContractDto } from './dto/create-employee-contract.dto';
import { GenerateEmployeeContractExpiryAlertsDto } from './dto/generate-employee-contract-expiry-alerts.dto';
import { ListEmployeeContractsDto } from './dto/list-employee-contracts.dto';
import { UpdateEmployeeContractDto } from './dto/update-employee-contract.dto';
import { EmployeeContractsService } from './employee-contracts.service';

@ApiTags('Employee Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee-contracts')
export class EmployeeContractsController {
  constructor(
    private readonly employeeContractsService: EmployeeContractsService,
  ) {}

  @Post()
  @RequirePermissions('employee-contracts.create')
  @ApiOperation({ summary: 'Create employee contract' })
  create(
    @Body() payload: CreateEmployeeContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeContractsService.create(payload, user.userId);
  }

  @Post('generate-expiry-alerts')
  @RequirePermissions('employee-contracts.notify-expiring')
  @ApiOperation({ summary: 'Generate expiry alerts for contracts nearing end date' })
  generateExpiryAlerts(
    @Body() payload: GenerateEmployeeContractExpiryAlertsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeContractsService.generateExpiryAlerts(
      payload,
      user.userId,
    );
  }

  @Post(':id/renew-draft')
  @RequirePermissions('employee-contracts.create')
  @ApiOperation({ summary: 'Create a renewal draft from an existing contract' })
  createRenewalDraft(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeContractsService.createRenewalDraft(id, user.userId);
  }

  @Get()
  @RequirePermissions('employee-contracts.read')
  @ApiOperation({ summary: 'Get paginated employee contracts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'isCurrent', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListEmployeeContractsDto) {
    return this.employeeContractsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('employee-contracts.read')
  @ApiOperation({ summary: 'Get employee contract by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeContractsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee-contracts.update')
  @ApiOperation({ summary: 'Update employee contract' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateEmployeeContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeeContractsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-contracts.delete')
  @ApiOperation({ summary: 'Soft delete employee contract' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeContractsService.remove(id, user.userId);
  }
}
