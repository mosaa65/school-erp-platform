import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendHomeworkNotificationsDto {
  @ApiPropertyOptional({
    example: 'يرجى متابعة تنفيذ الواجب قبل نهاية الأسبوع.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requiredAction?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  markAsSent?: boolean;
}
