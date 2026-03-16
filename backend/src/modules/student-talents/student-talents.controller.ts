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
import { CreateStudentTalentDto } from './dto/create-student-talent.dto';
import { ListStudentTalentsDto } from './dto/list-student-talents.dto';
import { UpdateStudentTalentDto } from './dto/update-student-talent.dto';
import { StudentTalentsService } from './student-talents.service';

@ApiTags('Student Talents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-talents')
export class StudentTalentsController {
  constructor(private readonly studentTalentsService: StudentTalentsService) {}

  @Post()
  @RequirePermissions('student-talents.create')
  @ApiOperation({ summary: 'Create student-talent mapping' })
  create(
    @Body() payload: CreateStudentTalentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentTalentsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-talents.read')
  @ApiOperation({ summary: 'Get paginated student-talent mappings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'talentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentTalentsDto) {
    return this.studentTalentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-talents.read')
  @ApiOperation({ summary: 'Get student-talent mapping by ID' })
  findOne(@Param('id') id: string) {
    return this.studentTalentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-talents.update')
  @ApiOperation({ summary: 'Update student-talent mapping' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentTalentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentTalentsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-talents.delete')
  @ApiOperation({ summary: 'Soft delete student-talent mapping' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentTalentsService.remove(id, user.userId);
  }
}
