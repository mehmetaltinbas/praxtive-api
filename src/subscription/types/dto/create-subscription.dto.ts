import { IsNotEmpty } from 'class-validator';

export class CreateSubscriptionDto {
    @IsNotEmpty()
    readonly chosenPlanName!: string;
}
