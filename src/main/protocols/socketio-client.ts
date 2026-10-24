export interface SocketIOPacket {
  type: 'open' | 'close' | 'ping' | 'pong' | 'connect' | 'disconnect' | 'event' | 'ack' | 'error';
  event?: string;
  data?: any;
}

export function encodeSocketIOPacket(eventOrType: string, data?: any): string {
  if (eventOrType === 'ping') return '2';
  if (eventOrType === 'pong') return '3';
  if (eventOrType === 'connect') return '40';
  if (eventOrType === 'disconnect') return '41';

  const payloadArray = [eventOrType];
  if (data !== undefined) {
    payloadArray.push(data);
  }

  return `42${JSON.stringify(payloadArray)}`;
}

export function decodeSocketIOPacket(raw: string): SocketIOPacket | null {
  if (!raw || typeof raw !== 'string') return null;

  if (raw === '2') return { type: 'ping' };
  if (raw === '3') return { type: 'pong' };
  if (raw.startsWith('0')) {
    try {
      return { type: 'open', data: JSON.parse(raw.slice(1)) };
    } catch {
      return { type: 'open' };
    }
  }

  if (raw.startsWith('40')) {
    return { type: 'connect' };
  }

  if (raw.startsWith('41')) {
    return { type: 'disconnect' };
  }

  if (raw.startsWith('42')) {
    try {
      const arr = JSON.parse(raw.slice(2));
      if (Array.isArray(arr) && arr.length > 0) {
        return {
          type: 'event',
          event: arr[0],
          data: arr[1]
        };
      }
    } catch {
      return { type: 'error', data: raw };
    }
  }

  return { type: 'error', data: raw };
}
