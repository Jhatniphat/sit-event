import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // หรือระบุ domain ของ frontend คุณ
  },
})
export class EventRegistrationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // เก็บ mapping ระหว่าง socketId กับ userId (Optional: เพื่อความง่ายในการ debug)
  private activeUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.activeUsers.delete(client.id);
  }

  // 1. รับ Event เมื่อ Participant เปิดหน้า QR Code
  @SubscribeMessage('join-qr-session')
  handleJoinQrSession(
    @MessageBody() data: { eventId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // ให้ User เข้า Room ชื่อเฉพาะ: "user-{userId}"
    // เพื่อให้เราเช็คได้ง่ายๆ ว่า User คนนี้ Online อยู่ไหม
    const roomName = `user-${data.userId}`;
    client.join(roomName);
    this.activeUsers.set(client.id, data.userId);
    console.log(`User ${data.userId} joined QR session for Event ${data.eventId}`);
  }

  // 2. ฟังก์ชันสำหรับ Service เรียกเพื่อเช็คว่า User เปิด QR อยู่ไหม
  isUserActive(userId: string): boolean {
    const roomName = `user-${userId}`;
    const room = this.server.sockets.adapter.rooms.get(roomName);
    if (room && room.size > 0) {
      return true;
    }
    return false;
  }

  // 3. ฟังก์ชันสำหรับ Service เรียกเพื่อแจ้งเตือน User ว่า Check-in สำเร็จ
  notifyCheckInSuccess(userId: string, eventId: string, eventName: string) {
    const roomName = `user-${userId}`;
    this.server.to(roomName).emit('check-in-complete', {
      success: true,
      eventId,
      eventName,
      timestamp: new Date(),
    });
  }
}