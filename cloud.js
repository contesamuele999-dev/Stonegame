/* STONE TEMPLE CARDS GAME — account, livelli, classifica generale e collezione online (Supabase).
 * Solo fetch, nessuna libreria. La chiave "anon" è pubblica per natura: i dati sono protetti
 * dalle regole del database (supabase/schema.sql), non dalla segretezza della chiave.
 * API: Cloud.init() · signedIn() · signIn(email, pw) · signUp(email, pw) · recover(email) · setPassword(pw) · logout()
 *      profile() · createProfile(nome) · rename(nome) · record(vinta, modalita, livello, carte)
 *      leaderboard() · collection() · addToCollection(ids) · levelOf(xp) · titleOf(livello) · xpFor(livello)
 */
(function () {
  'use strict';
  const BASE = 'https://jfbxdkupgoiqfoacbnyf.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYnhka3VwZ29pcWZvYWNibnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjI3NDYsImV4cCI6MjEwNjM5ODc0Nn0.DTvw2OWbHXVBkiAXAQT55K1YdIXPO_gIIoBL3Cnzkl4';
  const STORE = 'stt_sessione';

  // sessione: { access_token, refresh_token, expires_at (secondi), user: { id, email } }
  let ses = null;
  try { ses = JSON.parse(localStorage.getItem(STORE)); } catch (e) { ses = null; }
  function save(s) {
    ses = s;
    try { if (s) localStorage.setItem(STORE, JSON.stringify(s)); else localStorage.removeItem(STORE); } catch (e) { /* niente */ }
  }
  const now = () => Date.now() / 1000;
  const fromAuth = d => ({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(now() + (d.expires_in || 3600)),
    user: d.user ? { id: d.user.id, email: d.user.email } : (ses && ses.user) || null,
  });

  // messaggi d'errore di Supabase tradotti in qualcosa di comprensibile
  function friendly(d, status) {
    const m = String((d && (d.msg || d.message || d.error_description || d.error)) || '');
    if (/invalid login credentials/i.test(m)) return 'Email o password sbagliate.';
    if (/email not confirmed/i.test(m)) return "Prima conferma l'email: apri il link che ti abbiamo mandato.";
    if (/already registered|already been registered/i.test(m)) return 'Esiste già un account con questa email: entra con la tua password.';
    if (/password/i.test(m) && /(at least|characters|weak|short)/i.test(m)) return 'La password deve avere almeno 6 caratteri.';
    if (/same.*password|different from the old/i.test(m)) return 'La nuova password deve essere diversa da quella vecchia.';
    if (/expired|invalid/i.test(m) && /token|link|otp/i.test(m)) return 'Il link è scaduto: chiedine uno nuovo.';
    if (/rate limit|too many|security purposes/i.test(m)) return 'Troppe richieste: aspetta qualche minuto e riprova.';
    if (/duplicate key|profili_nome_key/i.test(m)) return 'Questo nome è già usato da un altro giocatore.';
    if (/troppo presto/i.test(m)) return 'Punti non assegnati: è passata meno di un minuto dalla partita precedente.';
    if (/check constraint/i.test(m)) return 'Il nome deve avere da 2 a 20 caratteri.';
    if (/email/i.test(m) && /invalid/i.test(m)) return 'Indirizzo email non valido.';
    return m || `Errore ${status}`;
  }

  async function raw(path, opt) {
    const h = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opt.headers || {});
    const r = await fetch(BASE + path, { method: opt.method || 'GET', headers: h, body: opt.body === undefined ? undefined : JSON.stringify(opt.body) });
    const txt = await r.text();
    let d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) { d = txt; }
    if (!r.ok) { const err = new Error(friendly(d, r.status)); err.status = r.status; throw err; }
    return d;
  }

  // il token dura un'ora: lo rinnovo prima che scada (una richiesta alla volta)
  let refreshing = null;
  async function token() {
    if (!ses) return null;
    if (ses.expires_at - 60 > now()) return ses.access_token;
    if (!refreshing) {
      refreshing = raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ses.refresh_token } })
        .then(d => { save(fromAuth(d)); })
        .catch(e => { if (e.status >= 400 && e.status < 500) save(null); /* offline: tengo la sessione */ })
        .finally(() => { refreshing = null; });
    }
    await refreshing;
    return ses ? ses.access_token : null;
  }

  async function api(path, opt) {
    opt = opt || {};
    const t = await token();
    if (!t) { const e = new Error('Devi entrare nel tuo account.'); e.status = 401; throw e; }
    return raw(path, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + t }, opt.headers || {}) }));
  }

  // ------------------------------------------------------------ accesso con email e password
  const back = () => encodeURIComponent(location.origin + location.pathname);
  async function signIn(email, password) {
    save(fromAuth(await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })));
  }
  // se Supabase chiede di confermare l'email, la sessione arriva solo dopo aver aperto il link
  async function signUp(email, password) {
    const d = await raw('/auth/v1/signup?redirect_to=' + back(), { method: 'POST', body: { email, password } });
    if (d && d.access_token) { save(fromAuth(d)); return { signedIn: true }; }
    return { confirm: true };
  }
  const recover = email => raw('/auth/v1/recover?redirect_to=' + back(), { method: 'POST', body: { email } });
  const setPassword = password => api('/auth/v1/user', { method: 'PUT', body: { password } });

  // chi tocca un link nell'email (conferma dell'account o nuova password) torna al sito con i token dopo il "#"
  async function init() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('error_description')) {
      history.replaceState(null, '', location.pathname + location.search);
      return { error: friendly({ msg: h.get('error_description') }, 400) };
    }
    if (!h.get('access_token')) return {};
    save({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: +h.get('expires_at') || Math.floor(now() + (+h.get('expires_in') || 3600)), user: null });
    history.replaceState(null, '', location.pathname + location.search);
    try {
      const u = await api('/auth/v1/user');
      ses.user = { id: u.id, email: u.email }; save(ses);
      return { signedIn: true, recovery: h.get('type') === 'recovery' };
    } catch (e) { save(null); return { error: e.message }; }
  }
  async function logout() {
    try { await api('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* esco comunque */ }
    save(null);
  }

  // ------------------------------------------------------------ profilo, partite, classifica, collezione
  const me = () => ses.user.id;
  async function profile() {
    const r = await api(`/rest/v1/profili?id=eq.${me()}&select=nome,xp,vittorie,sconfitte`);
    return r[0] || null;
  }
  const createProfile = nome => api('/rest/v1/profili', { method: 'POST', body: { id: me(), nome }, headers: { Prefer: 'return=minimal' } });
  const rename = nome => api(`/rest/v1/profili?id=eq.${me()}`, { method: 'PATCH', body: { nome }, headers: { Prefer: 'return=minimal' } });
  // restituisce i punti esperienza guadagnati
  const record = (vinta, modalita, livello, carte) => api('/rest/v1/rpc/registra_partita', { method: 'POST', body: { vinta, modalita, livello: livello || null, carte } });
  const leaderboard = () => raw('/rest/v1/profili?select=nome,xp,vittorie,sconfitte&order=xp.desc,vittorie.desc&limit=50', {});
  async function collection() { return (await api(`/rest/v1/collezione?giocatore=eq.${me()}&select=carta`)).map(x => x.carta); }
  async function addToCollection(ids) {
    if (!ids.length) return;
    await api('/rest/v1/collezione', { method: 'POST', body: ids.map(carta => ({ giocatore: me(), carta })), headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
  }

  // ------------------------------------------------------------ livelli
  // livello L si raggiunge con 25 × (L−1)² punti: 25, 100, 225, 400…
  const levelOf = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
  const xpFor = l => 25 * (l - 1) * (l - 1);
  const TITLES = [[15, 'Gran Maestro'], [11, 'Maestro'], [8, 'Istruttore'], [5, 'Allievo esperto'], [3, 'Allievo'], [1, 'Principiante']];
  const titleOf = l => TITLES.find(([min]) => l >= min)[1];

  window.Cloud = {
    init, signedIn: () => !!(ses && ses.user), email: () => (ses && ses.user ? ses.user.email : ''),
    signIn, signUp, recover, setPassword, logout, profile, createProfile, rename, record, leaderboard, collection, addToCollection,
    levelOf, xpFor, titleOf,
  };
})();
