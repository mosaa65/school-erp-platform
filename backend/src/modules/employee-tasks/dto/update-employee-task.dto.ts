import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeTaskDto } from './create-employee-task.dto';

export class UpdateEmployeeTaskDto extends PartialType(CreateEmployeeTaskDto) {}
