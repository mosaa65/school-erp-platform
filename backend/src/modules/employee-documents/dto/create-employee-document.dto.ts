import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDocumentDto {
  @ApiProperty({ example: 'cmf2f32b60000uvh95h7tk7q1' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ example: 'صورة الهوية الوطنية.pdf' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'https://cdn.school.local/hr/employees/emp-1/id-card.pdf' })
  @IsString()
  @MaxLength(500)
  filePath!: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiPropertyOptional({ example: 245000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  fileSize?: number;

  @ApiPropertyOptional({ example: 'هوية' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  fileCategory?: string;

  @ApiPropertyOptional({
    example: 'نسخة واضحة من بطاقة الهوية.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '2027-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
