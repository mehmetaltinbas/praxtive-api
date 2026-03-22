import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import ResponseBase from 'src/shared/types/response-base.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: any, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<ExpressResponse>();
        const request = ctx.getRequest<ExpressRequest>(); // Optional: useful for logging the path

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.message;

            this.logger.warn(`${request.method} ${request.url} - Status: ${status} - ${message}`);
        } else {
            this.logger.error(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                `${request.method} ${request.url} - Critical Error: ${exception?.message || 'Unknown'}`,
                exception instanceof Error ? exception.stack : undefined
            );
        }

        const body: ResponseBase = {
            isSuccess: false,
            message: message,
        };

        response.status(status).json(body);
    }
}
