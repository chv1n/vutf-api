// src/modules/notifications/notifications.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookie from 'cookie';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    },
    namespace: 'notifications',
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const rawCookies = client.handshake.headers.cookie;
            if (!rawCookies) {
                console.log(`[Notification] No cookies found`);
                client.disconnect();
                return;
            }

            const parsedCookies = cookie.parse(rawCookies);
            const token = parsedCookies['accessToken'] || parsedCookies['Authentication'];

            if (!token) {
                console.log(`[Notification] Token not found`);
                client.disconnect();
                return;
            }

            const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
            const payload = await this.jwtService.verifyAsync(token, { secret });

            const userId = payload.userId || payload.sub || payload.id || payload.user_id;

            if (userId) {
                await client.join(`user_${userId}`);
                // console.log(`[Notification] User ${userId} connected and joined room`);
            } else {
                console.log(`[Notification] UserId not found in payload`);
                client.disconnect();
            }

        } catch (error) {
            console.log(`[Notification] Auth failed: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // console.log(`Client disconnected: ${client.id}`);
    }

    // ส่งแจ้งเตือนหา User
    sendToUser(userId: string, data: any) {
        this.server.to(`user_${userId}`).emit('receive_notification', data);
    }
}