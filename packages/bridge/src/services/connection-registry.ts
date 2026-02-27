import { WebSocket } from 'ws';

export class ConnectionRegistry {
  private clients = new Set<WebSocket>();
  private clientProjectRoots = new Map<WebSocket, string>();

  constructor(private readonly defaultProjectRoot: string) {}

  addClient(ws: WebSocket) {
    this.clients.add(ws);
  }

  removeClient(ws: WebSocket) {
    this.clients.delete(ws);
    this.clientProjectRoots.delete(ws);
  }

  setProjectRoot(ws: WebSocket, projectRoot: string) {
    this.clientProjectRoots.set(ws, projectRoot);
  }

  getProjectRoot(ws: WebSocket): string {
    return this.clientProjectRoots.get(ws) || this.defaultProjectRoot;
  }

  getAllClients(): Iterable<WebSocket> {
    return this.clients;
  }

  clear() {
    this.clients.clear();
    this.clientProjectRoots.clear();
  }
}
