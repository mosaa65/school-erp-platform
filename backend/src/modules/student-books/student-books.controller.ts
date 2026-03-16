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
import { StudentBookStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStudentBookDto } from './dto/create-student-book.dto';
import { ListStudentBooksDto } from './dto/list-student-books.dto';
import { UpdateStudentBookDto } from './dto/update-student-book.dto';
import { StudentBooksService } from './student-books.service';

@ApiTags('Student Books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-books')
export class StudentBooksController {
  constructor(private readonly studentBooksService: StudentBooksService) {}

  @Post()
  @RequirePermissions('student-books.create')
  @ApiOperation({ summary: 'Create student book record' })
  create(@Body() payload: CreateStudentBookDto, @CurrentUser() user: AuthUser) {
    return this.studentBooksService.create(payload, user.userId);
  }

  @Get()
  @RequirePermissions('student-books.read')
  @ApiOperation({ summary: 'Get paginated student book records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentEnrollmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: StudentBookStatus })
  @ApiQuery({ name: 'fromIssuedDate', required: false, type: String })
  @ApiQuery({ name: 'toIssuedDate', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query() query: ListStudentBooksDto) {
    return this.studentBooksService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student-books.read')
  @ApiOperation({ summary: 'Get student book record by ID' })
  findOne(@Param('id') id: string) {
    return this.studentBooksService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('student-books.update')
  @ApiOperation({ summary: 'Update student book record' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateStudentBookDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentBooksService.update(id, payload, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('student-books.delete')
  @ApiOperation({ summary: 'Soft delete student book record' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentBooksService.remove(id, user.userId);
  }
}
