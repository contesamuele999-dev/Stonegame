# Stone Temple Card Game

Gioco di carte digitale per la palestra **Stone Temple Tao**, giocabile dal telefono con i 25 personaggi della palestra e 2 Leggende del Taijiquan stile Chen.

- **Contro il computer**, con tre livelli di difficoltà: facile, normale e difficile.
- **Torneo**: 5 incontri contro squadre sempre più forti, fino al Tempio dei Maestri.
- **In 2 giocatori sullo stesso telefono**, passandoselo a ogni turno.
- **Online su due telefoni**: chi crea la partita riceve un codice di 5 caratteri, l'altro lo inserisce. I telefoni si collegano direttamente (WebRTC con PeerJS), senza account.
- **Tutorial** guidato dal Maestro Samuele per la prima partita.
- **Carte da sbloccare**: si parte con 10 carte, ogni vittoria ne sblocca una (o tutte subito dalle impostazioni).
- **Classifica** di giocatori e carte, salvata sul telefono (comprese le partite online).
- **Account e classifica generale**: all'apertura si entra con email e password (o si gioca senza account); livelli con punti esperienza a ogni sfida, classifica di tutti i giocatori e carte sbloccate salvate online, da ritrovare su un altro telefono.
- **Suoni e musica** sintetizzati nel browser, **vibrazione** sui colpi forti, **partita salvata** in automatico e **installabile come app**, anche offline.
- **Collezione** con tutte le carte originali e i valori usati in gioco.
- **Animazioni 3D**: a ogni azione parte una scena in un'arena 3D. I lottatori hanno il volto preso dalla propria carta, la divisa nei colori della carta e la cintura del grado (oro Maestro, nera Istruttore, bianca Allievo). Ogni mossa ha il suo gesto e il suo effetto, e il bersaglio reagisce al risultato vero: danni, schivata, immunità, stordimento, confusione, K.O.
- **Teste 3D** con il volto della carta: cranio a uovo, viso proiettato sul davanti con i bordi sfumati, capelli e orecchie (il colore dei capelli si ricava dalla foto o si fissa a mano in `arena3d.js`).
- **Lottatori 3D** con divisa da kung fu (colletto alla coreana, alamari, maniche e pantaloni larghi, fascia con le code, scarpe con la suola bianca), luci realistiche e ombre vere sul pavimento.
- **Aure di energia** in stile Super Saiyan in base al grado: Allievo alone bianco, Istruttore fiamma blu, Maestro fiamma d'oro con fulmini e capelli luminosi a punta, Leggenda aura viola e oro con fulmini e onda d'urto. Chi agisce si carica all'inizio della scena; Maestri e Leggende coinvolti restano accesi.
- **Ologrammi** in stile Yu-Gi-Oh: ogni lottatore sta sulla propria carta appoggiata sul tatami e si materializza da lì con un fascio di luce. Con le mosse speciali la carta si alza e si attiva; quando un lottatore va K.O. la sua carta si spegne.
- **Velocità di gioco** regolabile in ogni momento (lenta, normale, veloce): pensata anche per chi ha bisogno di più tempo per leggere.

## Come aprirlo

Il gioco è una pagina web statica (`index.html` + `engine.js` + `ui.js` + cartella `img/`) e non ha bisogno di installazioni.

- **Dal computer**: scarica la cartella e apri `index.html` nel browser.
- **Online con GitHub Pages**: https://contesamuele999-dev.github.io/Stonegame/ (dalla repo pubblica `Stonegame`, branch `main`, cartella `/ (root)`; Pages si attiva da Settings → Pages).

### Animazioni

Dalle impostazioni si accendono o spengono le **animazioni 3D**. La **velocità di gioco** (🐢 lenta, ▶ normale, 🐇 veloce) si sceglie dalle impostazioni e con i tre tasti sempre visibili in alto a destra durante la partita (e in basso a destra durante le scene 3D): rallenta o accelera le scene, le mosse del computer e le scritte. Toccando lo schermo durante una scena la si fa scorrere velocemente. Se il telefono non supporta la grafica 3D (WebGL) il gioco usa automaticamente le animazioni semplici.

### Account (Supabase)

Account, livelli, classifica generale e collezione stanno su Supabase (`cloud.js`, senza librerie). Il database si crea una volta incollando `supabase/schema.sql` nell'editor SQL del progetto. La chiave "anon" nel codice è pubblica per natura: i dati sono protetti dalle regole del database (ognuno modifica solo il proprio nome; i punti si assegnano solo con la funzione `registra_partita`, al massimo una partita al minuto).

Nelle impostazioni di Supabase:
- *Authentication → URL Configuration*: Site URL `https://contesamuele999-dev.github.io/Stonegame/` (serve per i link nelle email: conferma dell'account e nuova password).
- *Authentication → Sign In / Providers → Email*: con "Confirm email" attivo chi si registra deve prima aprire il link nell'email; spento, entra subito.
- Il servizio email incluso in Supabase manda pochi messaggi l'ora: con tanti giocatori conviene collegare un servizio email proprio (*Authentication → SMTP*).

## Regolamento

**La squadra.** Ogni giocatore sceglie **4 carte** spendendo al massimo **10 Punti Dojo** (il costo è il numero dorato sulla carta). Le prime 3 vanno in campo; la quarta resta in riserva ed entra da sola quando una tua carta va K.O.

**Il turno.** Nel tuo turno **ogni carta in campo agisce una volta**, nell'ordine che preferisci. Per ciascuna scegli l'**Attacco** base oppure una delle sue **mosse speciali**. Ogni mossa speciale ha una ricarica (i turni da aspettare prima di riusarla), e alcune si usano una sola volta per partita. Chi inizia (a sorte) al primo turno agisce con 2 carte sole e solo con attacchi base: così la partenza è equa.

**I danni.** Danni = ATK × 50 ÷ (50 + DEF del bersaglio), con una piccola variazione casuale (±10%). DEF 50 dimezza il colpo, DEF 100 lo riduce a un terzo.

**Gli effetti.**
- *Stordimento / Paralisi*: la carta salta la sua azione. Finito lo stordimento, per un turno non può essere stordita di nuovo (niente stordimenti a catena).
- *Confusione*: a ogni azione offensiva c'è il 35% di probabilità di colpirsi per sbaglio.
- *Tecniche bloccate*: solo attacco base.
- Gli effetti durano i turni indicati. Uno stesso effetto non si somma: si rinnova.
- Il grado conta: diverse mosse fanno effetto doppio sugli **Istruttori** o sui **Maestri**, come scritto sulle carte.

**Sinergie.** Alcune combinazioni di gradi danno un bonus alla squadra:
- *Linea dei Maestri* (almeno 2 Maestri): i Maestri hanno +15 PV.
- *Istruttori affiatati* (almeno 2 Istruttori): gli Istruttori hanno +8 ATK.
- *Forza degli allievi* (almeno 3 Allievi): gli Allievi hanno +8 DEF.
- *Scuola completa* (almeno un Maestro, un Istruttore e un Allievo): tutte le carte +10 PV.

**Eventi in palestra.** Ogni 3 round capita qualcosa che vale per tutte le carte in campo, di entrambe le squadre, per un round: Lezione extra (+15 PV), Aria condizionata rotta (ATK −15%), Il Maestro osserva (+10 ATK a Maestri e Istruttori), Musica a palla (+10 ATK), Pulizie del tatami (via gli effetti negativi), Riscaldamento (+15 DEF). Si possono spegnere dalle impostazioni.

**Gradi.** Il grado è quello stampato sulla carta: Maestri (Andrea, Chen Delang, Chicca Fossa, Elia Moretton, Katya), Istruttori (Samuele Contessa, Niccolò Cividini, Strahinja Crnic, Federica Siciliano, Lorenzo Signorello), Allievi (tutte le carte senza grado stampato). Le **Leggende** Chen Wangting (Fondatore Supremo) e Chen Zhenglei (Gran Maestro) costano 6 Punti Dojo, contano come Maestri e si sbloccano vincendo il torneo.

**Palestre (carte terreno).** Ogni sfida si combatte in una palestra, scelta prima della partita o a sorte; il suo effetto vale per entrambe le squadre e nell'arena 3D cambiano fondale e pavimento.
- *Stone Temple Tao* (Lancenigo, sede principale): tutte le carte +15 PV e gli eventi in palestra capitano ogni 2 round invece di 3.
- *Palestrina delle medie* (Ponte della Priula): gli Allievi hanno +10 ATK e +10 DEF.
- *Palestra del Maestro Liming Yue* (Inghilterra): le mosse speciali si ricaricano un turno prima.
- *Piazza del Taiji* (Chenjiagou, Cina): Maestri e Leggende hanno +10 ATK e +10 DEF.

**Armi.** Mentre sceglie la squadra, ogni giocatore può dare un'arma dello stile Chen a una sua carta (non costa Punti Dojo). Nell'arena 3D il lottatore la tiene in mano.
- *Spada* (Jian): +15 ATK.
- *Doppia spada* (Shuang Jian): l'attacco base colpisce due volte, ognuna al 65%.
- *Sciabola* (Dao): l'attacco base fa +8 danni.
- *Doppia sciabola* (Shuang Dao): l'attacco base colpisce anche un secondo avversario a caso, al 50%.
- *Lancia* (Qiang): tutti i suoi colpi ignorano 15 punti di DEF.
- *Alabarda* (Chunqiu Dadao): +25 ATK ma −10 DEF.
- *Bastone al sopracciglio* (Qimei Gun): +15 DEF e l'attacco base stordisce per 1 turno nel 20% dei casi.
- *Asta lunga* (Da Gan): +25 DEF.

Armi e palestre sono state bilanciate come le carte: con migliaia di partite simulate, ogni arma vince fra il 49 e il 52% delle volte (chi non ne porta nessuna si ferma al 42%, quindi conviene sempre sceglierne una).

**Vittoria.** Vince chi manda K.O. tutte le carte avversarie, riserva compresa.

**Segreti.** Quando Chen usa la *Spallata del Prodigio*, a volte parte la musica dei Prodigy e i danni raddoppiano.

## Cosa è cambiato rispetto alle carte stampate

I **nomi delle mosse non sono stati toccati**. Sono cambiati i punti e, dove serviva, gli effetti, per tre motivi:

1. **Rendere giocabili gli effetti.** Alcune mosse avevano bisogno di una regola precisa. *Rimprovero Costruttivo* di Andrea e *Organizzazione Confusionaria* di Strahinja avevano lo stesso testo: ora hanno effetti diversi. *Sparizione Ultragenitoriale* ora scambia Vittorio con la riserva. *Chioma Rinata* trasforma Celeste in un'altra carta in campo.
2. **Aggiungere i PV** (punti vita), che sulle carte non c'erano.
3. **Bilanciare.** Ho fatto giocare il computer contro sé stesso per migliaia di partite con squadre casuali e ho corretto i valori finché ogni carta vinceva più o meno quanto le altre, tenendo conto del suo costo.

Valori in gioco (a sinistra della freccia il valore stampato sulla carta):

| Carta | Grado | Costo | PV | ATK | DEF |
|---|---|---|---|---|---|
| Chen Wangting | Fondatore Supremo | 6 | 170 | ∞ → **85** | ∞ → **90** |
| Chen Zhenglei | Gran Maestro | 6 | 135 | 1000 → **85** | 1000 → **70** |
| Andrea | Maestro | 4 | 145 | 120 → **85** | 95 → **75** |
| Chen Delang | Maestro | 4 | 155 | 100 → **80** | 100 → **70** |
| Elia Moretton | Maestro | 4 | 140 | 90 → **85** | 90 → **75** |
| Samuele Contessa | Istruttore | 4 | 165 | 100 → **90** | 90 → **70** |
| Chicca Fossa | Maestro | 3 | 140 | 70 → **65** | 60 |
| Katya | Maestro | 3 | 130 | 60 → **65** | 80 → **70** |
| Federica Siciliano | Istruttore | 3 | 135 | 50 → **60** | 50 → **55** |
| Lorenzo Signorello | Istruttore | 3 | 145 | 100 → **80** | 90 → **65** |
| Niccolò Cividini | Istruttore | 3 | 135 | 70 | 65 |
| Strahinja Crnic | Istruttore | 3 | 140 | 80 → **75** | 50 |
| Lorenzo Pattaro | Allievo | 3 | 145 | 90 → **80** | 80 → **55** |
| Adriano Rossetto | Allievo | 2 | 145 | 30 → **50** | 90 → **80** |
| Alessandro Rizzo | Allievo | 2 | 150 | 60 → **65** | 30 → **35** |
| Annastella Bettiol | Allievo | 2 | 150 | 40 → **60** | 50 |
| Carla Smania | Allievo | 2 | 120 | 50 | 70 → **55** |
| Celeste Brugnera | Allievo | 2 | 175 | 30 → **60** | 30 → **55** |
| Christian Cecchin | Allievo | 2 | 115 | 40 → **50** | 50 |
| Grazia Lecci | Allievo | 2 | 120 | 40 → **55** | 45 |
| Remigio Spinazzè | Allievo | 2 | 140 | 70 → **65** | 70 → **60** |
| Sara Semenzin | Allievo | 2 | 165 | 75 → **90** | -20 → **10** |
| Viola Donadi | Allievo | 2 | 125 | 40 → **50** | 50 |
| Vittorio Buosi | Allievo | 2 | 100 | 50 → **40** | 30 → **35** |
| Annalisa Brino | Allievo | 1 | 145 | 20 → **45** | 50 → **55** |
| Caterina Fighera | Allievo | 1 | 125 | 35 → **45** | 35 |
| Nicole Fava | Allievo | 1 | 130 | 30 → **35** | 35 |

### Le mosse in gioco

**Adriano Rossetto**
- *Vibrazione Ineluttabile* (passiva): Passiva: nessun effetto negativo può essergli applicato. Quando attacca, la protezione svanisce per un turno.
- *Ballo Dirompente* (ricarica 3): Interrompe tutti gli effetti (positivi e negativi) di tutte le altre carte in campo, poi colpisce un avversario a caso.

**Alessandro Rizzo**
- *Sudorazione Esplosiva* (ricarica 2): Attacca e applica bruciore anale al tocco: 12 danni per 3 turni (ignorano la difesa).
- *Piedi Lanosi* (ricarica 4): Aumenta la difesa del 300% per 2 turni.

**Andrea**
- *Calma Sovrastante* (ricarica 3): Annulla stordimento e ogni malus su tutta la sua squadra. Gli alleati non possono essere storditi per 2 turni.
- *Rimprovero Costruttivo* (ricarica 3): Assorbe la DEF dell'avversario (fino a 40): il bersaglio perde quei punti DEF e Andrea li somma al suo ATK per il turno successivo.

**Annalisa Brino**
- *Saluto Caritatevole* (ricarica 3): Abbassa di 25 i punti difesa di tutti gli avversari per 2 turni.
- *Ribaltamento Psicosomatico* (ricarica 4): Inverte i punti ATK e DEF dell'avversario per 2 turni.

**Annastella Bettiol**
- *Che Voglia di Vivere* (ricarica 2): Toglie 40 punti DEF a qualsiasi carta in campo (anche a sé stessa) per 2 turni.
- *Spaccaossa* (ricarica 3): Colpisce e toglie 30 punti ATK alla carta bersagliata per 2 turni.

**Carla Smania**
- *Stato Confusionale* (ricarica 4): Confonde gli Istruttori avversari per 1 turno e tutti gli altri avversari per 2. Può essere così forte da colpire anche lei (25%).
- *Bottiglia Eterna* (ricarica 3): Riutilizza a volontà l'ultima mossa speciale usata in campo da chiunque.

**Caterina Fighera**
- *Incazzatura Interstellare* (ricarica 3): Per 2 turni moltiplica ×2 tutti i danni che infligge… ma anche quelli che subisce.
- *Intenditrice Seriale* (una volta per partita): Una volta per partita: mette subito in tavola la carta di riserva (la squadra avrà 4 carte in campo).

**Celeste Brugnera**
- *Chioma Rinata* (una volta per partita): Una volta per partita: cambia aspetto trasformandosi in un'altra carta in campo (ne copia ATK, DEF, grado e mosse; mantiene i suoi PV).
- *Presenza Eterea* (passiva): Passiva: schiva automaticamente il primo attacco subito, poi si ricarica per 4 turni.

**Chen Delang**
- *Spallata del Prodigio* (ricarica 2): Attacco che apre un varco: ignora invulnerabilità, schivate e contrattacchi. 1 su 3: parte la musica dei Prodigy e i danni raddoppiano!
- *Addestramento Anticinese* (ricarica 3): Raddoppia i punti attacco per il prossimo attacco (entro il turno successivo).

**Chen Wangting**
- *Creazione Marziale* (ricarica 3): Fino al suo prossimo turno restituisce ogni attacco con il doppio dei danni, senza subirne. Non ferma gli attacchi che ignorano le difese.
- *Discendenza Impetuosa* (una volta per partita): Una volta per partita: converte in suo discepolo un avversario con metà dei PV o meno (non una Leggenda), che passa nella sua squadra.

**Chen Zhenglei**
- *Ciuffata Cosmica* (una volta per partita): Una volta per partita: ogni avversario in campo perde metà dei PV che gli restano (ignora qualsiasi difesa).
- *Forma Universale* (ricarica 6): Raddoppia ATK e DEF di tutta la sua squadra in campo per 1 turno.

**Chicca Fossa**
- *Blocco Telematico* (ricarica 3): Rallenta l'avversario (ATK −25% per 2 turni) e lo colpisce con la sua difesa dimezzata.
- *Ventaglio Perforante* (ricarica 1): Finge di avere caldo e attacca con il ventaglio: +10 danni extra.

**Christian Cecchin**
- *Apprendimento Fulmineo* (ricarica 4): Copia e usa subito una mossa speciale di un avversario in campo.
- *T-shirt Magistrali* (ricarica 3): Paralizza per 1 turno un avversario che non ha mai affrontato (mai colpito né subito colpi da lui) e lo colpisce.

**Elia Moretton**
- *Perfezionismo Compulsivo* (ricarica 3): Fa notare gli errori di tecnica: l'avversario dimezza il suo ATK per 2 turni.
- *Disallineamento Temporale* (una volta per partita): Una volta per partita: dimentica gli attacchi subiti. Recupera 40 PV, annulla i malus e ottiene +20 ATK permanenti; da ora il suo ATK non può più essere ridotto.

**Federica Siciliano**
- *Dominio dell'Infante* (ricarica 3): Evoca bambini non-morti che attaccano tutti gli avversari da ogni direzione: impossibile schivare, ma l'attacco è dimezzato.
- *Siculazione Distorta* (ricarica 4): Stordisce il nemico con frasi incomprensibili (1 turno) e attacca con +20 danni.

**Grazia Lecci**
- *Peluche Ipercoccoloso* (ricarica 4): L'avversario si innamora del peluche: lo colpisce con la sua DEF dimezzata e lo stordisce per 1 turno.
- *Pubblicità Fotogenica* (ricarica 1): Si mostra innocua per poi sferrare l'attacco con 10 punti extra.

**Katya**
- *Firma Urgente* (ricarica 3): Blocca le tecniche avversarie: per 1 turno nessun avversario può usare mosse speciali.
- *Annotazione Omnidirezionale* (ricarica 2): Colpisce con precisione qualsiasi avversario (+15 danni): ignora schivate e invulnerabilità. Si può usare anche se Katya è stordita.

**Lorenzo Pattaro**
- *Berserker dell'Ingiustizia* (ricarica 3): Ottiene +20 ATK per 2 turni.
- *Risposta Scazzata* (ricarica 5): Stordisce per 1 turno TUTTE le altre carte in campo, anche le sue (Istruttori e Maestri per 2 turni).

**Lorenzo Signorello**
- *Sussurro Eterno* (ricarica 4): Parla a ogni manifestazione dell'esistenza ed evoca eserciti: tutti gli avversari subiscono un attacco al 45% della sua forza.
- *Demassazione Fecale* (ricarica 3): Riduce la sua massa per diventare velocissimo: +10 ATK e +10 DEF per 2 turni e schiva il prossimo attacco.

**Niccolò Cividini**
- *Terza Persona Colloquiale* (ricarica 4): Stordisce il nemico dandogli del "Lei" per 2 turni.
- *Mutandone Dirompente* (ricarica 3): Indossa la divisa da Sumo: +20 ATK e +20 DEF per 3 turni.

**Nicole Fava**
- *Cameraman Improvvisato* (ricarica 3): Cattura l'istante perfetto: prende fino a 30 punti DEF dell'avversario e li aggiunge ai suoi per 2 turni; il suo prossimo attacco fa il 50% in più.
- *Gentilezza Ultrapremurosa* (ricarica 4): Il tocco magico della cura: +10 ATK e +10 DEF a ogni membro della squadra in campo per 2 turni, e 10 PV di cura.

**Remigio Spinazzè**
- *Potenziamento Tysoniano* (ricarica 2, al massimo 3 volte): Aumenta l'attacco di 10 punti per il resto della partita (fino a 3 volte).
- *Manutenzione Post-Apocalittica* (ricarica 4): Cura tutta la squadra in campo di 20 PV.

**Samuele Contessa**
- *Videopatia* (ricarica 3): Chi entra nell'obiettivo subisce ansia da prestazione: ATK e DEF −50% per 2 turni.
- *Gomiti di Ferro* (ricarica 4): Invulnerabile per 1 turno e +10 ATK per ogni carta Maestro in campo (per 2 turni).

**Sara Semenzin**
- *Stupro Mentale* (ricarica 3): Paralizza una carta per 2 turni. Effetto ×2 se la carta di Samuele è in campo: paralizza anche un secondo avversario.
- *Intenzione Fasulla* (ricarica 3): Finge un attacco: schiva il prossimo colpo e il suo attacco successivo ignora la DEF avversaria.

**Strahinja Crnic**
- *Dolori Omnidirezionali* (ricarica 4): Dolori che nessuno nota: ogni avversario in campo subisce 10 danni per 3 turni (ignorano la difesa).
- *Organizzazione Confusionaria* (ricarica 3): Attacca e confonde l'avversario per 2 turni (può colpirsi per sbaglio).

**Viola Donadi**
- *Volto Marmoreo* (ricarica 3): Annulla qualsiasi effetto ricevuto e diventa immune agli effetti per 2 turni. Recupera 20 PV.
- *Canto Apocalittico* (ricarica 4): Stordisce l'avversario (1 turno) e gli fa autoinfliggere il suo stesso attacco.

**Vittorio Buosi**
- *Depressione Istantanea* (ricarica 4): Azzera i punti difesa dell'avversario per 1 turno (usabile una volta ogni 5 turni) e lo colpisce.
- *Sparizione Ultragenitoriale* (ricarica 5): In qualsiasi momento, senza usare il turno: torna in riserva (perdendo ogni effetto) e la riserva entra al suo posto. Se non c'è riserva, sparisce e non può essere bersagliato per 1 turno.

## Bilanciamento

`tools/simulate.js` fa giocare l'IA contro sé stessa con squadre casuali da 9-10 Punti Dojo e riporta, per ogni carta, la percentuale di partite vinte dalla squadra che la contiene e quanto spesso usa ogni mossa.

```
node tools/simulate.js 8000          # 8000 partite al livello "normale"
node tools/livelli.js facile normale 300   # confronto tra livelli dell'IA
```

Ultimo risultato su 8000 partite con 30 carte, sinergie ed eventi attivi (in `tools/ultimo-bilanciamento.txt`): le carte normali tra il **45% e il 55%** di vittorie, le due Leggende intorno al **55-58%** (volutamente un po' sopra, perché vanno sbloccate), chi inizia vince il **50%** delle partite.

Il boss del torneo (Andrea, Chen Delang e Katya a livello difficile, un po' potenziati) viene battuto da una squadra casuale giocata dal computer circa 1 volta su 4.

Livelli dell'IA: la *facile* vince circa 1 partita su 4 contro la *normale*; la *normale* vince circa il 41% contro la *difficile*.

### Classifica condivisa

La classifica è salvata su ogni telefono. Per una classifica unica della palestra, condivisa fra tutti i telefoni, serve un piccolo database online (per esempio Firebase, gratuito): si può aggiungere in seguito.

### Partite online

Il collegamento usa il server pubblico gratuito di PeerJS solo per far "incontrare" i due telefoni; poi la partita viaggia direttamente fra loro. Su alcune reti molto chiuse (certe reti aziendali o scolastiche) il collegamento diretto può non riuscire: in quel caso basta usare i dati mobili. Entrambi i telefoni calcolano la partita con lo stesso seme casuale e si scambiano solo le mosse, quindi restano sempre allineati.

## File

| File | Contenuto |
|---|---|
| `index.html` | pagina del gioco e grafica |
| `ui.js` | schermate, tocchi, animazioni |
| `engine.js` | carte, regole, effetti e IA (funziona anche in Node) |
| `arena3d.js` | arena e lottatori 3D, coreografia di ogni mossa (tabella `MOVES`) |
| `audio.js` | effetti sonori, musica e vibrazione (Web Audio, nessun file audio) |
| `net.js` | partite online tra due telefoni (PeerJS) |
| `vendor/peerjs.min.js` | PeerJS 1.5.4, collegamento diretto tra telefoni |
| `sw.js`, `manifest.webmanifest` | app installabile e funzionamento offline |
| `vendor/three.min.js` | Three.js r128 (grafica 3D), incluso così il gioco funziona anche offline |
| `img/` | carte originali ridimensionate; `img/volti/` i ritagli per le miniature; `img/teste/` i volti per le teste 3D |
| `tools/simulate.js` | simulatore di bilanciamento |
| `tools/livelli.js` | confronto tra i livelli di difficoltà |
| `tools/volti.py` | ritaglio delle miniature dalle carte |
| `tools/teste.py` | ritaglio dei volti per le teste 3D |
| `tools/tune.py` | piccolo aiuto per ritoccare i valori delle carte |

Per cambiare un valore basta modificare la carta in `engine.js` (per esempio `hp: 150, atk: 90, def: 75`) e rilanciare il simulatore.
