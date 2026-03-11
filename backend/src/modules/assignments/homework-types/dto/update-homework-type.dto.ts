import { PartialType } from '@nestjs/swagger';
import { CreateHomeworkTypeDto } from './create-homework-type.dto';

export class UpdateHomeworkTypeDto extends PartialType(CreateHomeworkTypeDto) {}
