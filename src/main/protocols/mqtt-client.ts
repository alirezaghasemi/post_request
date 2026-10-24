import mqtt, { type MqttClient, type IClientOptions } from 'mqtt';
import { EventEmitter } from 'node:events';

export interface MqttHistoryEntry {
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  topic: string;
  message: string;
  qos: number;
}

export class MqttClientManager extends EventEmitter {
  private clients: Map<string, MqttClient> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private history: Map<string, MqttHistoryEntry[]> = new Map();

  public async connect(
    clientId: string,
    brokerUrl: string,
    options?: IClientOptions
  ): Promise<void> {
    if (this.clients.has(clientId)) {
      await this.disconnect(clientId);
    }

    if (!this.topics.has(clientId)) {
      this.topics.set(clientId, new Set());
    }
    if (!this.history.has(clientId)) {
      this.history.set(clientId, []);
    }

    return new Promise((resolve, reject) => {
      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: `devpilot_${Math.random().toString(16).substring(2, 8)}`,
          clean: true,
          connectTimeout: 10000,
          ...options
        });

        client.on('connect', () => {
          this.clients.set(clientId, client);
          this.emit(`status:${clientId}`, 'connected');
          resolve();
        });

        client.on('message', (topic: string, payload: Buffer, packet: any) => {
          const messageStr = payload.toString();
          const entry: MqttHistoryEntry = {
            id: `mqtt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            direction: 'in',
            topic,
            message: messageStr,
            qos: packet.qos || 0
          };

          const list = this.history.get(clientId) || [];
          list.push(entry);
          this.history.set(clientId, list);

          this.emit(`message:${clientId}`, entry);
          this.emit('message', { clientId, entry });
        });

        client.on('error', (err) => {
          this.emit(`error:${clientId}`, err.message);
          reject(err);
        });

        client.on('close', () => {
          this.emit(`status:${clientId}`, 'disconnected');
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async subscribe(clientId: string, topic: string, qos: 0 | 1 | 2 = 0): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.connected) {
      throw new Error(`MQTT Client ${clientId} is not connected`);
    }

    return new Promise((resolve, reject) => {
      client.subscribe(topic, { qos }, (err) => {
        if (err) reject(err);
        else {
          const set = this.topics.get(clientId) || new Set();
          set.add(topic);
          this.topics.set(clientId, set);
          resolve();
        }
      });
    });
  }

  public async unsubscribe(clientId: string, topic: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.connected) return;

    return new Promise((resolve, reject) => {
      client.unsubscribe(topic, (err) => {
        if (err) reject(err);
        else {
          const set = this.topics.get(clientId);
          if (set) set.delete(topic);
          resolve();
        }
      });
    });
  }

  public async publish(
    clientId: string,
    topic: string,
    message: string,
    qos: 0 | 1 | 2 = 0
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.connected) {
      throw new Error(`MQTT Client ${clientId} is not connected`);
    }

    return new Promise((resolve, reject) => {
      client.publish(topic, message, { qos }, (err) => {
        if (err) reject(err);
        else {
          const entry: MqttHistoryEntry = {
            id: `mqtt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            direction: 'out',
            topic,
            message,
            qos
          };

          const list = this.history.get(clientId) || [];
          list.push(entry);
          this.history.set(clientId, list);

          this.emit(`message:${clientId}`, entry);
          resolve();
        }
      });
    });
  }

  public async disconnect(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (client) {
      await new Promise<void>((resolve) => {
        client.end(false, {}, () => resolve());
      });
      this.clients.delete(clientId);
    }
    this.topics.delete(clientId);
    this.emit(`status:${clientId}`, 'disconnected');
  }

  public isConnected(clientId: string): boolean {
    const client = this.clients.get(clientId);
    return client ? client.connected : false;
  }

  public getSubscribedTopics(clientId: string): string[] {
    const set = this.topics.get(clientId);
    return set ? Array.from(set) : [];
  }

  public getHistory(clientId: string): MqttHistoryEntry[] {
    return this.history.get(clientId) || [];
  }

  public onMessage(clientId: string, callback: (entry: MqttHistoryEntry) => void): () => void {
    const handler = (entry: MqttHistoryEntry) => callback(entry);
    this.on(`message:${clientId}`, handler);
    return () => {
      this.off(`message:${clientId}`, handler);
    };
  }
}
