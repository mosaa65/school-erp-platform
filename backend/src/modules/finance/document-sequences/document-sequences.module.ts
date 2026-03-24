import { Global, Module } from '@nestjs/common';
import { DocumentSequencesService } from './document-sequences.service';

@Global()
@Module({
  providers: [DocumentSequencesService],
  exports: [DocumentSequencesService],
})
export class DocumentSequencesModule {}
