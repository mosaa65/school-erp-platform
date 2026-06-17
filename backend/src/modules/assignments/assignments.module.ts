import { Module } from '@nestjs/common';
import { HomeworkTemplatesModule } from './homework-templates/homework-templates.module';
import { HomeworkRubricsModule } from './homework-rubrics/homework-rubrics.module';
import { HomeworkTypesModule } from './homework-types/homework-types.module';
import { HomeworksModule } from './homeworks/homeworks.module';
import { StudentHomeworksModule } from './student-homeworks/student-homeworks.module';

@Module({
  imports: [
    HomeworkTypesModule,
    HomeworkTemplatesModule,
    HomeworkRubricsModule,
    HomeworksModule,
    StudentHomeworksModule,
  ],
  exports: [
    HomeworkTypesModule,
    HomeworkTemplatesModule,
    HomeworkRubricsModule,
    HomeworksModule,
    StudentHomeworksModule,
  ],
})
export class AssignmentsModule {}
