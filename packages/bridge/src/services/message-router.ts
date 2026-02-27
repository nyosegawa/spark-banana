import { WebSocket } from 'ws';
import type { ServerMessage } from '../types';

export class MessageRouter {
  private requestSenders = new Map<string, WebSocket>();

  setRequestSender(requestId: string, sender: WebSocket) {
    this.requestSenders.set(requestId, sender);
  }

  removeSocket(sender: WebSocket) {
    for (const [requestId, ws] of this.requestSenders.entries()) {
      if (ws === sender) {
        this.requestSenders.delete(requestId);
      }
    }
  }

  sendToSender(requestId: string, msg: ServerMessage) {
    const sender = this.requestSenders.get(requestId);
    if (sender && sender.readyState === WebSocket.OPEN) {
      sender.send(JSON.stringify(msg));
    }
  }

  send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  broadcast(clients: Iterable<WebSocket>, msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  clear() {
    this.requestSenders.clear();
  }
}
