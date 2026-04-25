import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { VALID_ROUTE_PREFIXES } from 'src/shared/constants/valid-route-prefixes.constant';
import ResponseBase from 'src/shared/types/response-base.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    private isKnownRoute(url: string): boolean {
        const path = url.split('?')[0];

        return VALID_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
    }

    catch(exception: any, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<ExpressResponse>();
        const request = ctx.getRequest<ExpressRequest>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.message;

            if (
                (status === HttpStatus.NOT_FOUND && !this.isKnownRoute(request.url)) ||
                status === HttpStatus.UNAUTHORIZED
            ) {
                // Scanner/bot noise — silently return 404 or unauthorized 401
            } else {
                this.logger.warn(`${request.method} ${request.url} - Status: ${status} - ${message}`);
            }
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
