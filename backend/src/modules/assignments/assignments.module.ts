import { Module } from '@nestjs/common';
import { HomeworkTypesModule } from './homework-types/homework-types.module';
import { HomeworksModule } from './homeworks/homeworks.module';
import { StudentHomeworksModule } from './student-homeworks/student-homeworks.module';

@Module({
  imports: [HomeworkTypesModule, HomeworksModule, StudentHomeworksModule],
  exports: [HomeworkTypesModule, HomeworksModule, StudentHomeworksModule],
})
export class AssignmentsModule {}
