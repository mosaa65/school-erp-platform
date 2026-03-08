import { PartialType } from '@nestjs/swagger';
import { CreateStudentProblemDto } from './create-student-problem.dto';

export class UpdateStudentProblemDto extends PartialType(CreateStudentProblemDto) {}
