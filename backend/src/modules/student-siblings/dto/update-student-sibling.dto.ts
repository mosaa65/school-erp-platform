import { PartialType } from '@nestjs/swagger';
import { CreateStudentSiblingDto } from './create-student-sibling.dto';

export class UpdateStudentSiblingDto extends PartialType(
  CreateStudentSiblingDto,
) {}
