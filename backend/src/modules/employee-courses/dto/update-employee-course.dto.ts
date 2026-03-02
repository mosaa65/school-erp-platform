import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeCourseDto } from './create-employee-course.dto';

export class UpdateEmployeeCourseDto extends PartialType(
  CreateEmployeeCourseDto,
) {}
