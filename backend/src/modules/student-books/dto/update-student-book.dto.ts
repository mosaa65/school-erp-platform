import { PartialType } from '@nestjs/swagger';
import { CreateStudentBookDto } from './create-student-book.dto';

export class UpdateStudentBookDto extends PartialType(CreateStudentBookDto) {}
