import { Module } from '@nestjs/common';
import { ExerciseSetGroupController } from 'src/exercise-set-group/exercise-set-group.controller';
import { ExerciseSetGroupService } from 'src/exercise-set-group/exercise-set-group.service';

@Module({
    imports: [],
    controllers: [ExerciseSetGroupController],
    providers: [ExerciseSetGroupService],
    exports: [ExerciseSetGroupService],
})
export class ExerciseSetGroupModule {}
