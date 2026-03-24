import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateAnnualResultsDto {
  @ApiProperty({ example: 'cmabc123year' })
  @IsString()
  academicYearId!: string;

  @ApiProperty({ example: 'cmabc123section' })
  @IsString()
  sectionId!: string;
}
