import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import ResponseBase from 'src/shared/types/response-base.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<ExpressResponse>();

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body: ResponseBase = { isSuccess: false, message: exception.message };

            response.status(status).json(body);
        } else {
            console.error(exception);

            const body: ResponseBase = { isSuccess: false, message: 'Internal server error' };
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
        }
    }
}
