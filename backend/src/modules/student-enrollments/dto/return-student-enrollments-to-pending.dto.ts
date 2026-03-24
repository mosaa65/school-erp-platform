import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';

class ReturnStudentEnrollmentItemDto {
  @ApiProperty({ example: 'cmenrollment123' })
  @IsString()
  enrollmentId!: string;
}

export class ReturnStudentEnrollmentsToPendingDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123grade' })
  @IsString()
  gradeLevelId!: string;

  @ApiProperty({ type: [ReturnStudentEnrollmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnStudentEnrollmentItemDto)
  enrollments!: ReturnStudentEnrollmentItemDto[];
}
