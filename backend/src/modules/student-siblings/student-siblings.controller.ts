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
import { StudentSiblingRelationship } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentSiblingDto } from './dto/create-student-sibling.dto';
import { ListStudentSiblingsDto } from './dto/list-student-siblings.dto';
import { UpdateStudentSiblingDto } from './dto/update-student-sibling.dto';
import { StudentSiblingsService } from './student-siblings.service';

@ApiTags('Student Siblings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-siblings')
export class StudentSiblingsController {
  constructor(private readonly studentSiblingsService: StudentSiblingsService) {}

  @Post()
  @RequirePermissions('student-siblings.create')
  @ApiOperation({ summary: 'Create student sibling relationship' })
  create(
    @Body() payload: CreateStudentSiblingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentSiblingsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-siblings.read')
  @ApiOperation({ summary: 'Get paginated student sibling relationships' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'siblingId', required: false, type: String })
  @ApiQuery({ name: 'relationship', required: false, enum: StudentSiblingRelationship })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentSiblingsDto) {
    return this.studentSiblingsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-siblings.read')
  @ApiOperation({ summary: 'Get student sibling relationship by ID' })
  findOne(@Param('id') id: string) {
    return this.studentSiblingsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-siblings.update')
  @ApiOperation({ summary: 'Update student sibling relationship' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentSiblingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentSiblingsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-siblings.delete')
  @ApiOperation({ summary: 'Soft delete student sibling relationship' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentSiblingsService.remove(id, user.userId);
  }
}
