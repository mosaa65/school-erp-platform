import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class TransferStudentEnrollmentItemDto {
  @ApiProperty({ example: 'cmenrollment123' })
  @IsString()
  enrollmentId!: string;
}

export class TransferStudentEnrollmentsDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123grade' })
  @IsString()
  gradeLevelId!: string;

  @ApiProperty({ example: 'cmsection-source' })
  @IsString()
  sourceSectionId!: string;

  @ApiProperty({ example: 'cmsection-target' })
  @IsString()
  targetSectionId!: string;

  @ApiPropertyOptional({
    type: [TransferStudentEnrollmentItemDto],
    description:
      'If omitted, all active enrollments in the source section are moved.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferStudentEnrollmentItemDto)
  enrollments?: TransferStudentEnrollmentItemDto[];
}
