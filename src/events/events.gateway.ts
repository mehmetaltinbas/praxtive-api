import { UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthGuard } from 'src/auth/auth.guard';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { SourceService } from 'src/source/source.service';
import { SourceDocument } from 'src/source/types/source-document.interface';

@SkipThrottle()
@UseGuards(AuthGuard)
@WebSocketGateway({
    cors: {
        origin: 'http://localhost:4010',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    },
    transports: ['websocket'],
})
export class EventsGateway implements OnGatewayConnection {
    // @WebSocketServer()
    // server: Server; // platform-specific server instance

    // @WebSocketGateway()
    // namespace: Namespace; // corresponding namespace of the gateway

    constructor(
        private sourceService: SourceService,
        private exerciseSetService: ExerciseSetService
    ) {}

    async handleConnection(client: Socket, ...args: any[]): Promise<void> {
        await this.readAllSourcesByUserId(client);
    }

    @SubscribeMessage('read-all-sources-by-user-id')
    async readAllSourcesByUserId(@ConnectedSocket() client: Socket): Promise<SourceDocument[]> {
        if (client.user?.sub) {
            const response = await this.sourceService.readAllByUserId(client.user.sub);

            return response.sources;
        } else {
            return [];
        }
    }

    @SubscribeMessage('other-event')
    handleOtherEvent(@MessageBody() data: string, @ConnectedSocket() client: Socket): string {
        console.log(data);

        return 'return something';
    }

    // handleDisconnect(client: any) {

    // }
}
