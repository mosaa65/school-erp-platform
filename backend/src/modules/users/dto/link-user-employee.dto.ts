import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkUserEmployeeDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;
}
