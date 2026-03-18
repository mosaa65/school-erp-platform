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
import { CreateStudentProblemDto } from './dto/create-student-problem.dto';
import { ListStudentProblemsDto } from './dto/list-student-problems.dto';
import { UpdateStudentProblemDto } from './dto/update-student-problem.dto';
import { StudentProblemsService } from './student-problems.service';

@ApiTags('Student Problems')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-problems')
export class StudentProblemsController {
  constructor(
    private readonly studentProblemsService: StudentProblemsService,
  ) {}

  @Post()
  @RequirePermissions('student-problems.create')
  @ApiOperation({ summary: 'Create student problem record' })
  create(
    @Body() payload: CreateStudentProblemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentProblemsService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-problems.read')
  @ApiOperation({ summary: 'Get paginated student problem records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'problemType', required: false, type: String })
  @ApiQuery({ name: 'isResolved', required: false, type: Boolean })
  @ApiQuery({ name: 'fromProblemDate', required: false, type: String })
  @ApiQuery({ name: 'toProblemDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentProblemsDto) {
    return this.studentProblemsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-problems.read')
  @ApiOperation({ summary: 'Get student problem record by ID' })
  findOne(@Param('id') id: string) {
    return this.studentProblemsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-problems.update')
  @ApiOperation({ summary: 'Update student problem record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentProblemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentProblemsService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-problems.delete')
  @ApiOperation({ summary: 'Soft delete student problem record' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentProblemsService.remove(id, user.userId);
  }
}

