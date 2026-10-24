import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { executeGraphQL, buildIntrospectionQuery } from '../src/main/protocols/graphql-client';
import { WebSocketClientManager } from '../src/main/protocols/websocket-client';
import { encodeSocketIOPacket, decodeSocketIOPacket } from '../src/main/protocols/socketio-client';
import { MqttClientManager } from '../src/main/protocols/mqtt-client';

describe('Advanced Protocols Engine (Phase 7)', () => {
  describe('GraphQL Client & Introspection', () => {
    let server: http.Server;
    const testPort = 5566;

    beforeEach(async () => {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const parsed = JSON.parse(body);
            if (parsed.query && parsed.query.includes('__schema')) {
              // Return sample introspection schema
              res.end(
                JSON.stringify({
                  data: {
                    __schema: {
                      queryType: { name: 'Query' },
                      types: [
                        { name: 'Query', kind: 'OBJECT', fields: [{ name: 'getUser' }, { name: 'listItems' }] },
                        { name: 'User', kind: 'OBJECT', fields: [{ name: 'id' }, { name: 'email' }] }
                      ]
                    }
                  }
                })
              );
              return;
            }

            if (parsed.query && parsed.query.includes('getUser')) {
              res.end(
                JSON.stringify({
                  data: {
                    getUser: {
                      id: parsed.variables?.id || '123',
                      email: 'graphql@devpilot.test'
                    }
                  }
                })
              );
              return;
            }

            res.end(JSON.stringify({ data: null, errors: [{ message: 'Unknown query' }] }));
          } catch (e: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      await new Promise<void>((resolve) => server.listen(testPort, '127.0.0.1', () => resolve()));
    });

    afterEach(async () => {
      if ((server as any).closeAllConnections) {
        (server as any).closeAllConnections();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('should execute GraphQL queries with variables and return structured data', async () => {
      const result = await executeGraphQL({
        url: `http://127.0.0.1:${testPort}/graphql`,
        query: 'query GetUser($id: ID!) { getUser(id: $id) { id email } }',
        variables: { id: 'usr-789' }
      });

      expect(result.data).toBeDefined();
      expect(result.data.getUser.id).toBe('usr-789');
      expect(result.data.getUser.email).toBe('graphql@devpilot.test');
      expect(result.errors).toBeUndefined();
    });

    it('should generate valid introspection query and retrieve schema types', async () => {
      const introQuery = buildIntrospectionQuery();
      expect(introQuery).toContain('__schema');
      expect(introQuery).toContain('queryType');

      const result = await executeGraphQL({
        url: `http://127.0.0.1:${testPort}/graphql`,
        query: introQuery
      });

      expect(result.data?.__schema?.queryType?.name).toBe('Query');
      expect(result.data?.__schema?.types.length).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Client Manager', () => {
    let wsServer: WebSocketServer;
    let wsPort = 5577;
    let wsManager: WebSocketClientManager;

    beforeEach(async () => {
      wsServer = new WebSocketServer({ port: wsPort });
      wsServer.on('connection', (ws) => {
        ws.on('message', (msg) => {
          const text = msg.toString();
          if (text === 'ping') {
            ws.send('pong');
          } else {
            ws.send(`echo: ${text}`);
          }
        });
      });

      wsManager = new WebSocketClientManager();
    });

    afterEach(async () => {
      wsManager.disconnect('conn-test');
      await new Promise<void>((resolve) => wsServer.close(() => resolve()));
    });

    it('should connect, send messages, receive echo frames, and maintain event history', async () => {
      const connId = 'conn-test';
      const receivedMessages: string[] = [];

      wsManager.onMessage(connId, (entry) => {
        if (entry.direction === 'in') {
          receivedMessages.push(entry.data);
        }
      });

      await wsManager.connect(connId, `ws://127.0.0.1:${wsPort}`);
      expect(wsManager.getStatus(connId)).toBe('connected');

      // Send a test message
      wsManager.send(connId, 'Hello DevPilot WebSocket');

      // Wait for echo response
      await new Promise((r) => setTimeout(r, 100));

      expect(receivedMessages).toContain('echo: Hello DevPilot WebSocket');

      const history = wsManager.getHistory(connId);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some((h) => h.direction === 'out' && h.data === 'Hello DevPilot WebSocket')).toBe(true);
      expect(history.some((h) => h.direction === 'in' && h.data.includes('echo:'))).toBe(true);

      wsManager.disconnect(connId);
      expect(wsManager.getStatus(connId)).toBe('disconnected');
    });
  });

  describe('Socket.IO Protocol Framing', () => {
    it('should encode and decode Socket.IO v4 packets correctly', () => {
      const eventName = 'chat_message';
      const eventData = { user: 'Alice', text: 'Hello SocketIO' };

      const encoded = encodeSocketIOPacket(eventName, eventData);
      expect(encoded).toBe('42["chat_message",{"user":"Alice","text":"Hello SocketIO"}]');

      const decoded = decodeSocketIOPacket(encoded);
      expect(decoded).toBeDefined();
      expect(decoded?.type).toBe('event');
      expect(decoded?.event).toBe('chat_message');
      expect(decoded?.data).toEqual({ user: 'Alice', text: 'Hello SocketIO' });

      // Test Ping/Pong packets
      expect(encodeSocketIOPacket('ping')).toBe('2');
      expect(decodeSocketIOPacket('3')?.type).toBe('pong');
    });
  });

  describe('MQTT Client Protocol Support', () => {
    it('should initialize MQTT manager, track active connections, and handle topics', () => {
      const mqttManager = new MqttClientManager();
      expect(mqttManager).toBeDefined();

      const clientId = 'client-devpilot-1';
      expect(mqttManager.isConnected(clientId)).toBe(false);

      // Verify connection state and topic tracking structures
      const trackedTopics = mqttManager.getSubscribedTopics(clientId);
      expect(Array.isArray(trackedTopics)).toBe(true);
      expect(trackedTopics.length).toBe(0);
    });
  });
});
