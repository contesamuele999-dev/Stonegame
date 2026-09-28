/* STONE TEMPLE TAO — partite online tra due telefoni
 * Collegamento diretto (WebRTC) tramite PeerJS: chi crea la partita riceve un codice,
 * l'altro lo inserisce. Il server gratuito di PeerJS serve solo a far "incontrare" i due telefoni.
 *
 * API: Net.available() · Net.host(onEvent) → Promise<codice> · Net.join(codice, onEvent) → Promise
 *      Net.send(msg) · Net.close() · Net.role · Net.code
 * onEvent({type: 'connected'|'data'|'disconnected'|'error', data, message})
 */
(function () {
  'use strict';
  const PREFIX = 'stonetempletao-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente 0/O e 1/I per non confondersi
  let peer = null, conn = null, handler = null;

  // Per i test locali si può puntare a un altro server: window.STT_PEER_CONFIG = {host, port, path, secure}
  const cfg = () => Object.assign({ debug: 0 }, window.STT_PEER_CONFIG || {});

  function available() {
    return typeof window.Peer === 'function' && typeof window.RTCPeerConnection === 'function' && window.top === window;
  }

  function newCode() {
    let c = '';
    for (let i = 0; i < 5; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return c;
  }

  function emit(e) { if (handler) handler(e); }

  function wire(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (e) { /* già chiusa */ } }
    conn = c;
    c.on('open', () => emit({ type: 'connected' }));
    c.on('data', d => { if (c === conn) emit({ type: 'data', data: d }); });
    c.on('close', () => { if (c === conn) emit({ type: 'disconnected' }); });
    c.on('error', err => emit({ type: 'error', message: String(err && err.type || err) }));
  }

  function errText(err) {
    const t = err && err.type;
    if (t === 'peer-unavailable') return 'Nessuna partita con questo codice. Controlla il codice e che l\'altro telefono sia ancora in attesa.';
    if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Connessione al server di gioco non riuscita. Controlla internet e riprova.';
    if (t === 'browser-incompatible') return 'Questo browser non supporta il gioco online.';
    return 'Connessione non riuscita. Riprova tra poco.';
  }

  function openPeer(id) {
    return new Promise((resolve, reject) => {
      const p = id ? new window.Peer(id, cfg()) : new window.Peer(cfg());
      const t = setTimeout(() => { reject({ type: 'network' }); try { p.destroy(); } catch (e) { /* niente */ } }, 12000);
      p.on('open', () => { clearTimeout(t); resolve(p); });
      p.on('error', err => { clearTimeout(t); reject(err); });
    });
  }

  // Crea una partita: resta in attesa che l'altro entri con il codice.
  async function host(onEvent) {
    close();
    handler = onEvent;
    for (let tries = 0; tries < 4; tries++) {
      const code = newCode();
      try {
        peer = await openPeer(PREFIX + code);
      } catch (err) {
        if (err && err.type === 'unavailable-id') continue; // codice già in uso: ne prendo un altro
        throw new Error(errText(err));
      }
      Net.role = 'host'; Net.code = code;
      peer.on('connection', c => wire(c)); // anche le riconnessioni arrivano qui
      peer.on('error', err => { if (err && err.type !== 'peer-unavailable') emit({ type: 'error', message: errText(err) }); });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* niente */ } });
      return code;
    }
    throw new Error('Non riesco a creare la partita. Riprova.');
  }

  // Entra in una partita con il codice.
  async function join(code, onEvent) {
    close();
    handler = onEvent;
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) throw new Error('Il codice ha 5 caratteri.');
    try { peer = await openPeer(null); } catch (err) { throw new Error(errText(err)); }
    Net.role = 'guest'; Net.code = code;
    await connectTo(code);
  }

  function connectTo(code) {
    return new Promise((resolve, reject) => {
      let done = false;
      const onErr = err => { if (!done) { done = true; reject(new Error(errText(err))); } };
      peer.once('error', onErr);
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      const t = setTimeout(() => onErr({ type: 'peer-unavailable' }), 12000);
      c.on('open', () => { if (done) return; done = true; clearTimeout(t); peer.off('error', onErr); wire(c); emit({ type: 'connected' }); resolve(); });
    });
  }

  // Il giocatore che si è unito riprova a collegarsi dopo una disconnessione.
  async function rejoin() {
    if (Net.role !== 'guest' || !peer) throw new Error('Nessuna partita da ricollegare.');
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) { /* niente */ } }
    await connectTo(Net.code);
  }

  function send(msg) {
    if (conn && conn.open) { conn.send(msg); return true; }
    return false;
  }

  function close() {
    try { if (conn) conn.close(); } catch (e) { /* niente */ }
    try { if (peer) peer.destroy(); } catch (e) { /* niente */ }
    conn = null; peer = null; handler = null; Net.role = null; Net.code = null;
  }

  const Net = { available, host, join, rejoin, send, close, role: null, code: null, connected: () => !!(conn && conn.open) };
  window.Net = Net;
})();
