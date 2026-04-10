import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { CreateExerciseSetGroupDto } from 'src/exercise-set-group/types/dto/create-exercise-set-group.dto';
import { UpdateExerciseSetGroupDto } from 'src/exercise-set-group/types/dto/update-exercise-set-group.dto';
import { ExerciseSetGroupDocument } from 'src/exercise-set-group/types/exercise-set-group-document.interface';
import { ReadMultipleExerciseSetGroupsResponse } from 'src/exercise-set-group/types/response/read-multiple-exercise-set-groups.response';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class ExerciseSetGroupService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'ExerciseSetGroup', mongoose.Model<ExerciseSetGroupDocument>>
    ) {}

    async create(userId: string, dto: CreateExerciseSetGroupDto): Promise<ResponseBase> {
        const conflict = await this.db.ExerciseSetGroup.findOne({ userId, title: dto.title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `You already have an exercise set group with the title "${dto.title}".`,
            };
        }

        await this.db.ExerciseSetGroup.create({
            userId: new mongoose.Types.ObjectId(userId),
            title: dto.title,
        });

        return { isSuccess: true, message: 'Exercise set group created.' };
    }

    async readById(userId: string, id: string): Promise<ExerciseSetGroupDocument> {
        const exerciseSetGroup = await this.db.ExerciseSetGroup.findOne({ _id: id, userId });

        if (!exerciseSetGroup) {
            throw new NotFoundException(`Exercise set group not found by id ${id}.`);
        }

        return exerciseSetGroup;
    }

    async readAllByUserId(userId: string): Promise<ReadMultipleExerciseSetGroupsResponse> {
        const exerciseSetGroups = await this.db.ExerciseSetGroup.find({ userId });

        return {
            isSuccess: true,
            message: `All exercise set groups read by userId: ${userId}.`,
            exerciseSetGroups,
        };
    }

    async updateById(userId: string, id: string, dto: UpdateExerciseSetGroupDto): Promise<ResponseBase> {
        await this.readById(userId, id);

        if (dto.title) {
            const conflict = await this.db.ExerciseSetGroup.findOne({
                userId,
                title: dto.title,
                _id: { $ne: id },
            });

            if (conflict) {
                return {
                    isSuccess: false,
                    message: `An exercise set group with the title "${dto.title}" already exists.`,
                };
            }
        }

        const updated = await this.db.ExerciseSetGroup.findOneAndUpdate(
            { _id: id, userId },
            { $set: { ...dto } },
            { new: true }
        );

        if (!updated) {
            throw new NotFoundException('Exercise set group not found.');
        }

        return { isSuccess: true, message: 'Exercise set group updated.' };
    }

    async deleteById(userId: string, id: string): Promise<ResponseBase> {
        const deleted = await this.db.ExerciseSetGroup.findOneAndDelete({ _id: id, userId });

        if (!deleted) {
            throw new NotFoundException('Exercise set group not found.');
        }

        return { isSuccess: true, message: 'Exercise set group deleted.' };
    }
}
