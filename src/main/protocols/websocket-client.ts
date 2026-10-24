import { WebSocket } from 'ws';
import { EventEmitter } from 'node:events';

export interface WebSocketHistoryEntry {
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  data: string;
  sizeBytes: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export class WebSocketClientManager extends EventEmitter {
  private sockets: Map<string, WebSocket> = new Map();
  private history: Map<string, WebSocketHistoryEntry[]> = new Map();
  private statuses: Map<string, ConnectionStatus> = new Map();

  public async connect(
    connectionId: string,
    url: string,
    headers?: Record<string, string>
  ): Promise<void> {
    if (this.sockets.has(connectionId)) {
      this.disconnect(connectionId);
    }

    this.statuses.set(connectionId, 'connecting');
    if (!this.history.has(connectionId)) {
      this.history.set(connectionId, []);
    }

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url, { headers });

        ws.on('open', () => {
          this.statuses.set(connectionId, 'connected');
          this.sockets.set(connectionId, ws);
          this.emit(`status:${connectionId}`, 'connected');
          resolve();
        });

        ws.on('message', (data: Buffer | string) => {
          const text = data.toString();
          const entry: WebSocketHistoryEntry = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            direction: 'in',
            data: text,
            sizeBytes: Buffer.byteLength(text)
          };

          const list = this.history.get(connectionId) || [];
          list.push(entry);
          this.history.set(connectionId, list);

          this.emit(`message:${connectionId}`, entry);
          this.emit('message', { connectionId, entry });
        });

        ws.on('close', () => {
          this.statuses.set(connectionId, 'disconnected');
          this.sockets.delete(connectionId);
          this.emit(`status:${connectionId}`, 'disconnected');
          this.emit('status', { connectionId, status: 'disconnected' });
        });

        ws.on('error', (err) => {
          this.statuses.set(connectionId, 'error');
          this.emit(`error:${connectionId}`, err.message);
          this.emit('status', { connectionId, status: 'error', error: err.message });
          reject(err);
        });
      } catch (err) {
        this.statuses.set(connectionId, 'error');
        reject(err);
      }
    });
  }

  public send(connectionId: string, data: string): void {
    const ws = this.sockets.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket is not connected (status: ${this.getStatus(connectionId)})`);
    }

    ws.send(data);

    const entry: WebSocketHistoryEntry = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      direction: 'out',
      data,
      sizeBytes: Buffer.byteLength(data)
    };

    const list = this.history.get(connectionId) || [];
    list.push(entry);
    this.history.set(connectionId, list);

    this.emit(`message:${connectionId}`, entry);
    this.emit('message', { connectionId, entry });
  }

  public disconnect(connectionId: string): void {
    const ws = this.sockets.get(connectionId);
    if (ws) {
      try {
        ws.close();
      } catch {}
      this.sockets.delete(connectionId);
    }
    this.statuses.set(connectionId, 'disconnected');
    this.emit(`status:${connectionId}`, 'disconnected');
  }

  public getStatus(connectionId: string): ConnectionStatus {
    return this.statuses.get(connectionId) || 'disconnected';
  }

  public getHistory(connectionId: string): WebSocketHistoryEntry[] {
    return this.history.get(connectionId) || [];
  }

  public clearHistory(connectionId: string): void {
    this.history.set(connectionId, []);
  }

  public onMessage(
    connectionId: string,
    callback: (entry: WebSocketHistoryEntry) => void
  ): () => void {
    const handler = (entry: WebSocketHistoryEntry) => callback(entry);
    this.on(`message:${connectionId}`, handler);
    return () => {
      this.off(`message:${connectionId}`, handler);
    };
  }

  public onStatus(
    connectionId: string,
    callback: (status: ConnectionStatus) => void
  ): () => void {
    const handler = (status: ConnectionStatus) => callback(status);
    this.on(`status:${connectionId}`, handler);
    return () => {
      this.off(`status:${connectionId}`, handler);
    };
  }
}
