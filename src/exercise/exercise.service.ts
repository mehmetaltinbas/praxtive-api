import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ExerciseDocument } from './types/exercise-document.interface';
import { Model } from 'mongoose';
import { ReadAllExercisesResponse } from './types/response/read-all-exercises.response';
import { ReadSingleExerciseResponse } from './types/response/read-single-exercise.response';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { CreateExerciseDto } from './types/dto/create-exercise.dto';
import { OpenaiService } from '../openai/openai.service';
import { SourceService } from '../source/source.service';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

@Injectable()
export class ExerciseService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Exercise', Model<ExerciseDocument>>,
        private openaiService: OpenaiService,
        private sourceService: SourceService,
        @Inject(forwardRef(() => ExerciseSetService))
        private exerciseSetService: ExerciseSetService
    ) {}

    async create(exerciseSetId: string, dto: CreateExerciseDto): Promise<ResponseBase> {
        const { exerciseSet: associatedExerciseSet } = await this.exerciseSetService.readById(exerciseSetId);

        let createdExercise: ExerciseDocument | undefined = undefined;

        if (dto.type === ExerciseType.MCQ) {
            createdExercise = await this.db.Exercise.create({
                exerciseSetId,
                type: dto.type,
                difficulty: dto.difficulty,
                prompt: dto.prompt,
                choices: dto.choices,
                correctChoiceIndex: dto.correctChoiceIndex,
            });
        } else if (dto.type === ExerciseType.TRUE_FALSE) {
            createdExercise = await this.db.Exercise.create({
                exerciseSetId,
                type: dto.type,
                difficulty: dto.difficulty,
                prompt: dto.prompt,
                correctChoiceIndex: dto.correctChoiceIndex,
            });
        } else if (dto.type === ExerciseType.OPEN_ENDED) {
            createdExercise = await this.db.Exercise.create({
                exerciseSetId,
                type: dto.type,
                difficulty: dto.difficulty,
                prompt: dto.prompt,
                solution: dto.solution,
            });
        }

        if (!createdExercise) {
            throw new InternalServerErrorException("exercise couldn't be created");
        }

        if (dto.type === associatedExerciseSet.type) {
            await this.exerciseSetService.updateById(associatedExerciseSet._id, {
                count: associatedExerciseSet.count + 1,
            });
        } else if (dto.type !== associatedExerciseSet.type) {
            await this.exerciseSetService.updateById(associatedExerciseSet._id, {
                type: ExerciseSetType.MIX,
                count: associatedExerciseSet.count + 1,
            });
        }

        return { isSuccess: true, message: 'exercise created' };
    }

    async readAll(): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find();

        if (exercises.length === 0) {
            throw new NotFoundException('no exercises found');
        }

        return { isSuccess: true, message: 'all exercises read', exercises };
    }

    async readById(id: string): Promise<ReadSingleExerciseResponse> {
        const exercise = await this.db.Exercise.findById(id);

        if (!exercise) {
            throw new NotFoundException(`no exercise found by id: ${id}`);
        }

        return { isSuccess: true, message: `exercise read by id: ${id}`, exercise };
    }

    async readAllByExerciseSetId(exerciseSetId: string): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find({ exerciseSetId });

        if (!exercises || exercises.length === 0) {
            throw new NotFoundException(`no exercises found for exerciseSetId: ${exerciseSetId}`);
        }

        return {
            isSuccess: true,
            message: `all exercises read that has exerciseSetId: ${exerciseSetId}`,
            exercises,
        };
    }

    // async updateById() {

    // }

    async deleteById(id: string): Promise<ResponseBase> {
        const { exercise } = await this.readById(id);
        const { exerciseSet: associatedExerciseSet } = await this.exerciseSetService.readById(exercise.exerciseSetId);

        const deletedExercise = await this.db.Exercise.findByIdAndDelete(id);

        if (!deletedExercise) {
            throw new NotFoundException('no exercise found to delete');
        }

        await this.exerciseSetService.updateById(associatedExerciseSet._id, {
            count: associatedExerciseSet.count - 1,
        });

        return { isSuccess: true, message: `exercise deleted by id: ${id}` };
    }
}
