import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { FilterQuery } from 'mongoose';
import PDFDocument from 'pdfkit';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';
import { CreditEstimationService } from 'src/credit-transaction/services/credit-estimation.service';
import { CreditGuardService } from 'src/credit-transaction/services/credit-guard.service';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';
import { SourceTypeFactory } from 'src/source/strategies/type/source-type.factory';
import { CloneSourceDto } from 'src/source/types/dto/clone-source.dto';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { UpdateSourceDto } from 'src/source/types/dto/update-source.dto';
import { CreateSourceResponse } from 'src/source/types/response/create-source.response';
import { GetPdfResponse } from 'src/source/types/response/get-pdf.response';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';
import { SourceDocument } from 'src/source/types/source-document.interface';
import { TipTapDoc, TipTapMark, TipTapTextNode } from 'src/source/types/tiptap-doc.interface';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SourceService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Source', mongoose.Model<SourceDocument>>,
        private sourceTypeFactory: SourceTypeFactory,
        private userService: UserService,
        private creditGuardService: CreditGuardService,
        private costEstimationService: CreditEstimationService,
        private subscriptionService: SubscriptionService
    ) {}

    async create(userId: string, dto: CreateSourceDto, file?: Express.Multer.File): Promise<CreateSourceResponse> {
        const { plan } = await this.subscriptionService.getActivePlanForUser(userId);

        if (plan.maxSources !== -1) {
            const count = await this.db.Source.countDocuments({ user: userId });

            if (count >= plan.maxSources) {
                throw new ForbiddenException(
                    `Source limit reached (${plan.maxSources}). Upgrade your plan to create more sources.`
                );
            }
        }

        if (dto.type === SourceType.AUDIO) {
            if (!dto.durationSeconds) {
                throw new BadRequestException('durationSeconds is required for audio sources');
            }

            const estimate = await this.costEstimationService.estimateAudioTranscription(dto.durationSeconds);

            const session = await mongoose.startSession();

            session.startTransaction();

            try {
                await this.creditGuardService.assertAndDeduct(
                    userId,
                    estimate.credits,
                    CreditTransactionType.AUDIO_TRANSCRIPTION,
                    session
                );

                const strategy = this.sourceTypeFactory.resolveStrategy(dto.type);
                const { text, title } = await strategy.extract(dto, file);

                const conflict = await this.db.Source.findOne({ user: userId, title }).session(session);

                if (conflict) {
                    await session.abortTransaction();

                    return {
                        isSuccess: false,
                        message: `A source with the title "${title}" already exists.`,
                    };
                }

                const [created] = await this.db.Source.create(
                    [{ user: userId, type: dto.type, title, rawText: text, visibility: dto.visibility }],
                    { session }
                );

                await session.commitTransaction();

                return { isSuccess: true, message: 'source created', sourceId: created._id.toString() };
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }
        }

        const strategy = this.sourceTypeFactory.resolveStrategy(dto.type);
        const { text, title } = await strategy.extract(dto, file);

        const conflict = await this.db.Source.findOne({ user: userId, title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `A source with the title "${title}" already exists.`,
            };
        }

        const created = await this.db.Source.create({
            user: userId,
            type: dto.type,
            title,
            rawText: text,
            visibility: dto.visibility,
        });

        return { isSuccess: true, message: 'source created', sourceId: created._id.toString() };
    }

    /**
     * Clones a public source into the authenticated user's account.
     * The origin source is read via public access (visibility: PUBLIC).
     * The cloned source uses the visibility specified in the dto.
     * @param userId - The authenticated user cloning the source.
     * @param sourceId - The public source to clone.
     * @param dto - Contains the fields inputted from user cloning the source.
     */
    async clone(userId: string, sourceId: string, dto: CloneSourceDto): Promise<ResponseBase> {
        const { source: sourceSource } = await this.readById(undefined, sourceId);

        if (sourceSource.user === userId) {
            throw new ForbiddenException('You cannot clone your own source.');
        }

        const conflict = await this.db.Source.findOne({ user: userId, title: dto.title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `A source with the title "${dto.title}" already exists.`,
            };
        }

        await this.db.Source.create({
            user: new mongoose.Types.ObjectId(userId),
            type: sourceSource.type,
            title: dto.title,
            rawText: sourceSource.rawText,
            visibility: dto.visibility,
        });

        return { isSuccess: true, message: 'Source cloned' };
    }

    async readById(userId: string | undefined, id: string): Promise<ReadSingleSourceResponse> {
        const filter: FilterQuery<SourceDocument> = { _id: id };

        if (userId) {
            filter.user = userId;
        } else {
            filter.visibility = SourceVisibility.PUBLIC;
        }

        const source = await this.db.Source.findOne(filter);

        if (!source) {
            throw new NotFoundException(`source not found by id ${id}`);
        }

        return { isSuccess: true, message: `source read by id ${id}`, source };
    }

    async readAllByUserId(userId: string): Promise<ReadAllSourcesResponse> {
        const sources = await this.db.Source.find({ user: userId });

        return {
            isSuccess: true,
            message: `all sources read associated by userId: ${userId}`,
            sources,
        };
    }

    async readAllPublicByUserName(userName: string): Promise<ReadAllSourcesResponse> {
        const { user } = await this.userService.readPublicByUserName(userName);

        const sources = await this.db.Source.find({
            user: user._id,
            visibility: SourceVisibility.PUBLIC,
        });

        return { isSuccess: true, message: 'Public sources read', sources };
    }

    async updateById(userId: string, id: string, dto: UpdateSourceDto): Promise<ResponseBase> {
        const { title, ...restOfDto } = dto;

        await this.readById(userId, id);

        if (title) {
            const conflict = await this.db.Source.findOne({
                user: userId,
                title: title,
                _id: { $ne: id }, // exclude the current document from the search
            });

            if (conflict) {
                return {
                    isSuccess: false,
                    message: `A source with the title "${title}" already exists.`,
                };
            }
        }

        const updated = await this.db.Source.findOneAndUpdate(
            { _id: id, user: userId },
            {
                $set: {
                    ...restOfDto,
                    title,
                },
            },
            {
                new: true,
            }
        );

        if (!updated) {
            throw new NotFoundException('source not found');
        }

        return { isSuccess: true, message: 'source updated' };
    }

    async deleteById(userId: string, id: string): Promise<ResponseBase> {
        const deletedSource = await this.db.Source.findOneAndDelete({ _id: id, user: userId });

        if (!deletedSource) {
            throw new NotFoundException('source not found');
        }

        return { isSuccess: true, message: 'source deleted' };
    }

    async getPdf(userId: string | undefined, id: string): Promise<GetPdfResponse> {
        const { source } = await this.readById(userId, id);

        let doc: TipTapDoc | null = null;

        try {
            doc = JSON.parse(source.rawText) as TipTapDoc;
        } catch {
            doc = null;
        }

        return new Promise((resolve, reject) => {
            const document = new PDFDocument({ margins: { top: 36, bottom: 36, left: 72, right: 72 } });
            const buffers: Buffer[] = [];

            document.on('data', buffers.push.bind(buffers));
            document.on('error', reject);
            document.on('end', () => {
                const finalBuffer = Buffer.concat(buffers);

                resolve({
                    isSuccess: true,
                    message: 'PDF generated successfully.',
                    pdfBase64: finalBuffer.toString('base64'),
                });
            });

            document.font('Times-Bold').fontSize(16).text(source.title, { align: 'center' });
            document.moveDown(1);

            if (doc && doc.type === 'doc' && Array.isArray(doc.content)) {
                doc.content.forEach((paragraph) => {
                    const textNodes: TipTapTextNode[] = Array.isArray(paragraph?.content) ? paragraph.content : [];

                    if (textNodes.length === 0) {
                        document.moveDown(0.5);

                        return;
                    }

                    textNodes.forEach((textNode, idx) => {
                        const font = this.resolveFont(textNode.marks);
                        const isLast = idx === textNodes.length - 1;

                        document
                            .font(font)
                            .fontSize(12)
                            .text(textNode.text ?? '', { continued: !isLast });
                    });

                    document.moveDown(0.5);
                });
            } else {
                document
                    .font('Times-Roman')
                    .fontSize(12)
                    .text(source.rawText ?? '');
            }

            document.end();
        });
    }

    private resolveFont(marks: TipTapMark[] | undefined): string {
        const types = new Set((marks ?? []).map((m) => m.type));
        const bold = types.has('bold');
        const italic = types.has('italic');

        if (bold && italic) return 'Times-BoldItalic';
        if (bold) return 'Times-Bold';
        if (italic) return 'Times-Italic';

        return 'Times-Roman';
    }
}
