import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ApplySiblingDiscountDto {
  @ApiProperty({ example: 'guardian-id-123', description: 'Guardian ID to find siblings' })
  @IsString()
  @MaxLength(191)
  guardianId!: string;

  @ApiProperty({ example: 'cmabc123year', description: 'Academic year ID' })
  @IsString()
  @MaxLength(191)
  academicYearId!: string;
}
