import { OBSWebSocket } from 'obs-websocket-js';

const obs = new OBSWebSocket();

try {
    const {
      obsWebSocketVersion,
      negotiatedRpcVersion
    } = await obs.connect('ws://localhost:4455', 'r8j7JLKc0hwsQlEM', {
      rpcVersion: 1
    });
    console.log(`Connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`)
  } catch (error) {
    console.error('Failed to connect', error.code, error.message);
  }