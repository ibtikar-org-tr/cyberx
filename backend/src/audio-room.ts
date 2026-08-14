import { DurableObject } from 'cloudflare:workers';

export class AudioRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const role = new URL(request.url).searchParams.get('role') === 'publisher' ? 'publisher' : 'listener';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [role]);

    queueMicrotask(() => {
      if (role === 'publisher') {
        this.sendListenState(server);
      }
      this.broadcastListenState();
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const tags = this.ctx.getTags(ws);
    if (!tags.includes('publisher') || typeof message === 'string') {
      return;
    }

    for (const listener of this.ctx.getWebSockets('listener')) {
      if (listener.readyState === WebSocket.OPEN) {
        listener.send(message);
      }
    }
  }

  async webSocketClose() {
    this.broadcastListenState();
  }

  async webSocketError() {
    this.broadcastListenState();
  }

  private sendListenState(publisher: WebSocket) {
    if (publisher.readyState !== WebSocket.OPEN) {
      return;
    }

    publisher.send(
      JSON.stringify({
        type: 'listen',
        listening: this.hasActiveListeners(),
      })
    );
  }

  private broadcastListenState() {
    const payload = JSON.stringify({
      type: 'listen',
      listening: this.hasActiveListeners(),
    });

    for (const publisher of this.ctx.getWebSockets('publisher')) {
      if (publisher.readyState === WebSocket.OPEN) {
        publisher.send(payload);
      }
    }
  }

  private hasActiveListeners() {
    return this.ctx.getWebSockets('listener').some((socket) => socket.readyState === WebSocket.OPEN);
  }
}
