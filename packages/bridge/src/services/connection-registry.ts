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

  hasProjectRoot(ws: WebSocket): boolean {
    const root = this.clientProjectRoots.get(ws);
    return typeof root === 'string' && root.trim().length > 0;
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
