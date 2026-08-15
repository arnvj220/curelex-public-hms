// hms-react/src/hooks/useSocket.js

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── Singleton socket — created once, lives for the app lifetime ──────────────
let socketInstance = null;

// In prod, default to same-origin (undefined -> socket.io-client uses window.location)
// so it works behind any domain without a rebuild; override with VITE_SOCKET_URL
// if the API lives elsewhere. Note: socket.io-client only same-origins on `undefined`,
// not on an empty string, so the fallback must stay `undefined`.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : undefined);

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.3,
      autoConnect: true,
    });
  }
  return socketInstance;
}

// ── FIX: Export a reset helper so AuthContext can force the socket to
//    disconnect and reconnect after login/logout (clears stale room state
//    on the server when the DB is wiped and new user IDs are issued). ────────
export function resetSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  return getSocket(); // creates a fresh connected instance
}

export const useSocket = () => {
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const s = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    };

    // Sync in case socket connected between render and this effect running
    setIsConnected(s.connected);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
    };
  }, []);

  const emit = useCallback((event, data, callback) => {
    const s = getSocket();
    if (s.connected) {
      if (callback) s.emit(event, data, callback);
      else s.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit "${event}" — socket not connected`);
    }
  }, []);

  const on = useCallback((event, callback) => {
    getSocket().on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    getSocket().off(event, callback);
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    emit,
    on,
    off,
  };
};