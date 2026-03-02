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
import { GuardianRelationship } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentGuardianDto } from './dto/create-student-guardian.dto';
import { ListStudentGuardiansDto } from './dto/list-student-guardians.dto';
import { UpdateStudentGuardianDto } from './dto/update-student-guardian.dto';
import { StudentGuardiansService } from './student-guardians.service';

@ApiTags('Student Guardians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-guardians')
export class StudentGuardiansController {
  constructor(
    private readonly studentGuardiansService: StudentGuardiansService,
  ) {}

  @Post()
  @RequirePermissions('student-guardians.create')
  @ApiOperation({ summary: 'Create student-guardian relationship' })
  create(
    @Body() payload: CreateStudentGuardianDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentGuardiansService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-guardians.read')
  @ApiOperation({ summary: 'Get paginated student-guardian relationships' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'guardianId', required: false, type: String })
  @ApiQuery({
    name: 'relationship',
    required: false,
    enum: GuardianRelationship,
  })
  @ApiQuery({ name: 'isPrimary', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentGuardiansDto) {
    return this.studentGuardiansService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-guardians.read')
  @ApiOperation({ summary: 'Get student-guardian relationship by ID' })
  findOne(@Param('id') id: string) {
    return this.studentGuardiansService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-guardians.update')
  @ApiOperation({ summary: 'Update student-guardian relationship' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentGuardianDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentGuardiansService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-guardians.delete')
  @ApiOperation({ summary: 'Soft delete student-guardian relationship' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentGuardiansService.remove(id, user.userId);
  }
}
