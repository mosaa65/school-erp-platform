import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDepartmentDto {
  @ApiPropertyOptional({ example: 'HR-OPS' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @ApiProperty({ example: 'العمليات والموارد البشرية' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'قسم يتابع عمليات شؤون الموظفين.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
