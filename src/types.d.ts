import JwtPayload from 'src/auth/types/jwt-payload.interface';

declare module 'express' {
    interface Request {
        user?: JwtPayload; // same type as above
    }
}

declare module 'socket.io' {
    interface Socket {
        user?: JwtPayload;
    }
}
