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
import { CreateStudentInvoiceDto } from './dto/create-student-invoice.dto';
import { ListStudentInvoicesDto } from './dto/list-student-invoices.dto';
import { UpdateStudentInvoiceDto } from './dto/update-student-invoice.dto';
import { StudentInvoicesService } from './student-invoices.service';

@ApiTags('Finance - Student Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/student-invoices')
export class StudentInvoicesController {
  constructor(private readonly studentInvoicesService: StudentInvoicesService) {}

  @Post()
  @RequirePermissions('student-invoices.create')
  @ApiOperation({ summary: 'Create student invoice' })
  create(
    @Body() payload: CreateStudentInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentInvoicesService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-invoices.read')
  @ApiOperation({ summary: 'Get paginated student invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'enrollmentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'currencyId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() query: ListStudentInvoicesDto) {
    return this.studentInvoicesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-invoices.read')
  @ApiOperation({ summary: 'Get student invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.studentInvoicesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-invoices.update')
  @ApiOperation({ summary: 'Update student invoice' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentInvoicesService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-invoices.delete')
  @ApiOperation({ summary: 'Cancel student invoice' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentInvoicesService.remove(id, user.userId);
  }
}
