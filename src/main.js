import './style.css'
import OBSWebSocket from 'obs-websocket-js';

async function main() {
  const obs = new OBSWebSocket();
  obs.connect({address: 'localhost:4455'});
  console.log("connecté !");
}

main();

