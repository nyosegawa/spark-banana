import { WebSocket } from 'ws';
import { detectProjectRootFromOrigin } from './project-root-detector';

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

  setProjectRootFromOrigin(ws: WebSocket, origin?: string): string | null {
    if (!origin) return null;
    const detected = detectProjectRootFromOrigin(origin);
    if (detected) {
      this.clientProjectRoots.set(ws, detected);
    }
    return detected;
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
