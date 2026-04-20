import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request as ExpressRequest } from 'express';
import { Socket } from 'socket.io';
import JwtPayload from 'src/auth/types/jwt-payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private configService: ConfigService,
        private jwtService: JwtService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const contextType = context.getType();

        if (contextType === 'http') {
            const request: ExpressRequest = context.switchToHttp().getRequest();
            let token;

            token = this.extractTokenFromHeader(request);

            if (!token) {
                token = this.extractTokenFromCookie(request);

                if (!token) {
                    throw new UnauthorizedException();
                }
            }

            try {
                const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
                    secret: this.configService.get<string>('JWT_SECRET'),
                });

                // We're assigning the payload to the request object here
                // so that we can access it in our route handlers
                request['user'] = payload;
            } catch {
                throw new UnauthorizedException();
            }

            return true;
        } else if (contextType === 'ws') {
            const wsArgumentsHost = context.switchToWs();
            const wsClient = wsArgumentsHost.getClient<Socket>();
            const wsData = wsArgumentsHost.getData<unknown>();
            let token;

            token = this.extractTokenFromHeader(wsClient);

            if (!token) {
                token = this.extractTokenFromCookie(wsClient);

                if (!token) {
                    throw new UnauthorizedException();
                }
            }

            try {
                const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
                    secret: this.configService.get<string>('JWT_SECRET'),
                });

                // We're assigning the payload to the request object here
                // so that we can access it in our route handlers
                // console.log(payload);
                wsClient['user'] = payload;
            } catch {
                throw new UnauthorizedException();
            }

            return true;
        }

        return false;
    }

    private extractTokenFromHeader(requestOrSocket: ExpressRequest | Socket): string | undefined {
        if (this.isExpressRequest(requestOrSocket)) {
            if (requestOrSocket.headers.authorization !== undefined) {
                const [type, token] = requestOrSocket.headers.authorization?.split(' ') ?? [];

                return type === 'Bearer' ? token : undefined;
            }

            return undefined;
        } else if (this.isSocket(requestOrSocket)) {
            if (requestOrSocket.handshake.headers.authorization !== undefined) {
                const [type, token] = requestOrSocket.handshake.headers.authorization?.split(' ') ?? [];

                return type === 'Bearer' ? token : undefined;
            }
        }

        return undefined;
    }

    private extractTokenFromCookie(requestOrSocket: ExpressRequest | Socket): string | undefined {
        const jwtCookieName = this.configService.get<string>('JWT_COOKIE_NAME');

        if (jwtCookieName !== undefined) {
            if (this.isExpressRequest(requestOrSocket)) {
                if (requestOrSocket.cookies) {
                    const token = (requestOrSocket.cookies as Record<string, string>)[jwtCookieName];

                    return token;
                }
            } else if (this.isSocket(requestOrSocket)) {
                if (requestOrSocket.handshake.headers.cookie) {
                    const cookie = requestOrSocket.handshake.headers.cookie;
                    const sliceStartIndex = jwtCookieName.length + 1;
                    const token = cookie.slice(sliceStartIndex);

                    return token;
                }
            }

            return undefined;
        } else {
            return undefined;
        }
    }

    private isExpressRequest(obj: any): obj is ExpressRequest {
        return typeof obj === 'object' && obj !== null && 'headers' in obj && 'cookies' in obj;
    }

    private isSocket(obj: any): obj is Socket {
        return typeof obj === 'object' && obj !== null && 'handshake' in obj;
    }
}
