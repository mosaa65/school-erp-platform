import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGender } from '@prisma/client';

export class CreateGuardianDto {
  @ApiProperty({ example: 'Ahmed Mohammed Saleh' })
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ enum: StudentGender, example: StudentGender.MALE })
  @IsOptional()
  @IsEnum(StudentGender)
  gender?: StudentGender;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  genderId?: number;

  @ApiPropertyOptional({ example: 'ID-90909012' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  idNumber?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTypeId?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  localityId?: number | null;

  @ApiPropertyOptional({ example: '+967777111222' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phonePrimary?: string;

  @ApiPropertyOptional({ example: '+967733444555' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneSecondary?: string;

  @ApiPropertyOptional({ example: '+967777111222' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'Sanaa - Al-Safiya district' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  residenceText?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
