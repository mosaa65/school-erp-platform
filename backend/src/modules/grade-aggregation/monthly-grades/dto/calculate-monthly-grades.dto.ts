import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateMonthlyGradesDto {
  @ApiProperty({ example: 'cmabc123month' })
  @IsString()
  academicMonthId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;

  @ApiProperty({ example: 'cmabc123subject' })
  @IsString()
  subjectId!: string;

}
