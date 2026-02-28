import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
        const associatedExerciseSet = (await this.exerciseSetService.readById(exerciseSetId)).exerciseSet;

        if (!associatedExerciseSet) {
            return { isSuccess: false, message: 'no associated exercise set found' };
        }

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
            return { isSuccess: false, message: "exercise couldn't created" };
        }

        if (dto.type === associatedExerciseSet.type) {
            const exerciseSetUpdateResponse = await this.exerciseSetService.updateById(associatedExerciseSet._id, {
                count: associatedExerciseSet.count + 1,
            });

            if (!exerciseSetUpdateResponse.isSuccess) {
                return {
                    isSuccess: false,
                    message: `exercise created but exercise count of exercise set couldn't updated, the update response message: ${exerciseSetUpdateResponse.message}`,
                };
            }
        } else if (dto.type !== associatedExerciseSet.type) {
            const exerciseSetUpdateResponse = await this.exerciseSetService.updateById(associatedExerciseSet._id, {
                type: ExerciseSetType.MIX,
                count: associatedExerciseSet.count + 1,
            });

            if (!exerciseSetUpdateResponse.isSuccess) {
                return {
                    isSuccess: false,
                    message: `exercise created but exercise count of exercise set couldn't updated, the update response message: ${exerciseSetUpdateResponse.message}`,
                };
            }
        }

        return { isSuccess: true, message: 'exercise created' };
    }

    async readAll(): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find();

        if (exercises.length === 0) {
            return { isSuccess: false, message: 'no exercise found' };
        }

        return { isSuccess: true, message: 'all exercises read', exercises };
    }

    async readById(id: string): Promise<ReadSingleExerciseResponse> {
        const exercise = await this.db.Exercise.findById(id);

        if (!exercise) {
            return { isSuccess: false, message: 'no exercise found' };
        }

        return { isSuccess: true, message: `exercise read by id: ${id}`, exercise };
    }

    async readAllByExerciseSetId(exerciseSetId: string): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find({ exerciseSetId });

        if (!exercises || exercises.length === 0) {
            return {
                isSuccess: false,
                message: `no exercise found that has exerciseSetId: ${exerciseSetId}`,
            };
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
        const exercise = (await this.readById(id)).exercise;

        if (!exercise) {
            return { isSuccess: false, message: 'no exercise found assoicated with given id' };
        }

        const associatedExerciseSet = (await this.exerciseSetService.readById(exercise.exerciseSetId)).exerciseSet;

        if (!associatedExerciseSet) {
            return { isSuccess: false, message: 'no assoicated exercise set found' };
        }

        const deletedExercise = await this.db.Exercise.findByIdAndDelete(id);

        if (!deletedExercise) {
            return { isSuccess: false, message: 'no exercise found to delete' };
        }

        const exerciseSetUpdateResponse = await this.exerciseSetService.updateById(associatedExerciseSet._id, {
            count: associatedExerciseSet.count - 1,
        });

        if (!exerciseSetUpdateResponse.isSuccess) {
            return {
                isSuccess: false,
                message: `exercise deleted but exercise count of associated exercise set couldn't updated,
                the update response message: ${exerciseSetUpdateResponse.message}`,
            };
        }

        return { isSuccess: true, message: `exercise deleted by id: ${id}` };
    }
}
