import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ManualDistributionAssignmentDto {
  @ApiProperty({ example: 'cmenrollment123' })
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ example: 'cmsection123' })
  @IsString()
  sectionId!: string;
}

export class ManualDistributeStudentEnrollmentsDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123grade' })
  @IsString()
  gradeLevelId!: string;

  @ApiProperty({ type: [ManualDistributionAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualDistributionAssignmentDto)
  assignments!: ManualDistributionAssignmentDto[];
}
