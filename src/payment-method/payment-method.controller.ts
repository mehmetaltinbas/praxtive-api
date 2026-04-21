// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { PaymentMethodService } from 'src/payment-method/payment-method.service';
import { AddPaymentMethodDto } from 'src/payment-method/types/dto/add-payment-method.dto';
import { CreateSetupIntentDto } from 'src/payment-method/types/dto/create-setup-intent.dto';
import { SetDefaultPaymentMethodDto } from 'src/payment-method/types/dto/set-default-payment-method.dto';
import { AddPaymentMethodResponse } from 'src/payment-method/types/response/add-payment-method.response';
import { CreateSetupIntentResponse } from 'src/payment-method/types/response/create-setup-intent.response';
import { DeletePaymentMethodResponse } from 'src/payment-method/types/response/delete-payment-method.response';
import { ReadAllPaymentMethodsResponse } from 'src/payment-method/types/response/read-all-payment-methods.response';
import { SetDefaultPaymentMethodResponse } from 'src/payment-method/types/response/set-default-payment-method.response';
import User from 'src/shared/custom-decorators/user.decorator';

@Controller('payment-method')
@UseGuards(AuthGuard)
export class PaymentMethodController {
    constructor(private paymentMethodService: PaymentMethodService) {}

    @Get('read-all')
    async readAll(@User() user: JwtPayload): Promise<ReadAllPaymentMethodsResponse> {
        return this.paymentMethodService.readAll(user.sub);
    }

    @Post('setup-intent')
    async setupIntent(@User() user: JwtPayload, @Body() dto: CreateSetupIntentDto): Promise<CreateSetupIntentResponse> {
        return this.paymentMethodService.createSetupIntent(user.sub, dto);
    }

    @Post('add')
    async add(@User() user: JwtPayload, @Body() dto: AddPaymentMethodDto): Promise<AddPaymentMethodResponse> {
        return this.paymentMethodService.add(user.sub, dto);
    }

    @Post('set-default')
    async setDefault(
        @User() user: JwtPayload,
        @Body() dto: SetDefaultPaymentMethodDto
    ): Promise<SetDefaultPaymentMethodResponse> {
        return this.paymentMethodService.setDefault(user.sub, dto);
    }

    @Delete(':id')
    async delete(@User() user: JwtPayload, @Param('id') id: string): Promise<DeletePaymentMethodResponse> {
        return this.paymentMethodService.delete(user.sub, id);
    }
}
