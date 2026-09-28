# Stone Temple Tao: il torneo di carte

Gioco di carte digitale per la palestra **Stone Temple Tao**, giocabile dal telefono con i 24 personaggi della palestra.

- **Contro il computer**, con tre livelli di difficoltà: facile, normale e difficile.
- **In 2 giocatori sullo stesso telefono**, passandoselo a ogni turno.
- **Collezione** con tutte le carte originali e i valori usati in gioco.
- **Animazioni 3D**: a ogni azione parte una scena in un'arena 3D. I lottatori hanno il volto preso dalla propria carta, la divisa nei colori della carta e la cintura del grado (oro Maestro, nera Istruttore, bianca Allievo). Ogni mossa ha il suo gesto e il suo effetto, e il bersaglio reagisce al risultato vero: danni, schivata, immunità, stordimento, confusione, K.O.

## Come aprirlo

Il gioco è una pagina web statica (`index.html` + `engine.js` + `ui.js` + cartella `img/`) e non ha bisogno di installazioni.

- **Dal computer**: scarica la cartella e apri `index.html` nel browser.
- **Online con GitHub Pages**: https://contesamuele999-dev.github.io/Stones-Trip/ (attivo dopo aver reso pubblica la repo e acceso Pages da Settings → Pages, pubblicando dal branch `claude/gym-game-character-cards-7x2mik`, cartella `/ (root)`).

### Animazioni

Nella schermata prima della squadra (e con il pulsante in alto durante la partita) si sceglie fra **3D**, **3D veloce** e **Senza 3D**. Toccando lo schermo durante una scena la si fa scorrere velocemente. Se il telefono non supporta la grafica 3D (WebGL) il gioco usa automaticamente le animazioni semplici.

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

**Vittoria.** Vince chi manda K.O. tutte le carte avversarie, riserva compresa.

**Segreti.** Prima del *Delirio Onnipotente*, Flavio ha 10 secondi per scrivere la formula "fate tiri fate titi luis zoratto": se è giusta, l'effetto raddoppia. Quando Chen usa la *Spallata del Prodigio*, a volte parte la musica dei Prodigy e i danni raddoppiano.

## Cosa è cambiato rispetto alle carte stampate

I **nomi delle mosse non sono stati toccati**. Sono cambiati i punti e, dove serviva, gli effetti, per tre motivi:

1. **Rendere giocabili gli effetti.** Alcune mosse avevano bisogno di una regola precisa. *Rimprovero Costruttivo* di Andrea e *Organizzazione Confusionaria* di Strahinja avevano lo stesso testo: ora hanno effetti diversi. *Sparizione Ultragenitoriale* ora scambia Vittorio con la riserva. *Chioma Rinata* trasforma Celeste in un'altra carta in campo.
2. **Aggiungere i PV** (punti vita), che sulle carte non c'erano.
3. **Bilanciare.** Ho fatto giocare il computer contro sé stesso per migliaia di partite con squadre casuali e ho corretto i valori finché ogni carta vinceva più o meno quanto le altre, tenendo conto del suo costo.

Valori in gioco (a sinistra della freccia il valore stampato sulla carta):

| Carta | Grado | Costo | PV | ATK | DEF |
|---|---|---|---|---|---|
| Andrea | Maestro | 4 | 150 | 120 → **90** | 95 → **75** |
| Chen Delang | Maestro | 4 | 160 | 100 → **80** | 100 → **70** |
| Elia Moretton | Maestro | 4 | 140 | 90 | 90 → **75** |
| Samuele Contessa | Istruttore | 4 | 170 | 100 → **90** | 90 → **70** |
| Chicca Fossa | Maestro | 3 | 140 | 70 → **65** | 60 |
| Federica Siciliano | Istruttore | 3 | 140 | 50 → **60** | 50 → **55** |
| Katya | Maestro | 3 | 140 | 60 → **65** | 80 → **75** |
| Lorenzo Pattaro | Allievo | 3 | 145 | 90 → **80** | 80 → **55** |
| Niccolò Cividini | Istruttore | 3 | 140 | 70 → **75** | 65 |
| Strahinja Crnic | Istruttore | 3 | 140 | 80 → **75** | 50 |
| Adriano Rossetto | Allievo | 2 | 145 | 30 → **50** | 90 → **80** |
| Alessandro Rizzo | Allievo | 2 | 145 | 60 → **65** | 30 |
| Annastella Bettiol | Allievo | 2 | 140 | 40 → **55** | 50 |
| Carla Smania | Allievo | 2 | 120 | 50 | 70 → **55** |
| Celeste Brugnera | Allievo | 2 | 150 | 30 → **55** | 30 → **45** |
| Christian Cecchin | Allievo | 2 | 115 | 40 → **45** | 50 |
| Federico Franc. | Allievo | 2 | 125 | 80 → **65** | 30 → **35** |
| Flavio Neso | Allievo | 2 | 105 | 40 → **50** | 30 → **35** |
| Grazia Lecci | Allievo | 2 | 120 | 40 → **55** | 45 |
| Oksana Chorna | Allievo | 2 | 150 | 65 → **70** | 0 → **30** |
| Sara Semenzin | Allievo | 2 | 165 | 75 → **90** | -20 → **10** |
| Viola Donadi | Allievo | 2 | 125 | 40 → **50** | 50 |
| Vittorio Buosi | Allievo | 2 | 110 | 50 → **45** | 30 → **35** |
| Caterina Fighera | Allievo | 1 | 125 | 35 → **45** | 35 |

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

**Federico Franc.**
- *Domanda Ossessiva Compulsiva* (ricarica 3): Punti di domanda che durano fino a 3 giorni: colpisce e applica stato confusionale per 3 turni. Effetto duplicato sulle carte Istruttore (probabilità doppia di colpirsi da sole).

**Flavio Neso**
- *Delirio Onnipotente* (ricarica 5): Infligge danni irreparabili (ignorano la DEF) e stordisce il bersaglio per 1 turno. Effetto ×2 (danni e stordimento) se evocata con la formula "fate tiri fate titi luis zoratto".
- *Fuckgammon* (ricarica 4): Fino al suo prossimo turno: chi lo attacca si vede rubare il 50% dei PV attuali (massimo 40), che Flavio recupera.

**Grazia Lecci**
- *Peluche Ipercoccoloso* (ricarica 4): L'avversario si innamora del peluche: lo colpisce con la sua DEF dimezzata e lo stordisce per 1 turno.
- *Pubblicità Fotogenica* (ricarica 1): Si mostra innocua per poi sferrare l'attacco con 10 punti extra.

**Katya**
- *Firma Urgente* (ricarica 3): Blocca le tecniche avversarie: per 1 turno nessun avversario può usare mosse speciali.
- *Annotazione Omnidirezionale* (ricarica 2): Colpisce con precisione qualsiasi avversario (+15 danni): ignora schivate e invulnerabilità. Si può usare anche se Katya è stordita.

**Lorenzo Pattaro**
- *Berserker dell'Ingiustizia* (ricarica 3): Ottiene +20 ATK per 2 turni.
- *Risposta Scazzata* (ricarica 5): Stordisce per 1 turno TUTTE le altre carte in campo, anche le sue (Istruttori e Maestri per 2 turni).

**Niccolò Cividini**
- *Terza Persona Colloquiale* (ricarica 4): Stordisce il nemico dandogli del "Lei" per 2 turni.
- *Mutandone Dirompente* (ricarica 3): Indossa la divisa da Sumo: +20 ATK e +20 DEF per 3 turni.

**Oksana Chorna**
- *Sputo dell'Ultralama* (ricarica 4): Rallenta tutti gli avversari in campo per 3 turni: ATK −30% (−60% sulle carte Istruttore).
- *Rettifica Genealogica* (ricarica 4): Trasforma una carta alleata (non Istruttore/Maestro) in Istruttore: +20 ATK e +20 DEF per il resto della partita. Attenzione: alcune mosse fanno effetto doppio sugli Istruttori!

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

Ultimo risultato su 8000 partite (in `tools/ultimo-bilanciamento.txt`): tutte le carte tra il **45% e il 54%** di vittorie, chi inizia vince il **51%** delle partite, una partita dura in media **8-9 turni** per giocatore.

Livelli dell'IA: la *facile* vince circa 1 partita su 4 contro la *normale*; la *normale* vince circa il 41% contro la *difficile*.

## File

| File | Contenuto |
|---|---|
| `index.html` | pagina del gioco e grafica |
| `ui.js` | schermate, tocchi, animazioni |
| `engine.js` | carte, regole, effetti e IA (funziona anche in Node) |
| `arena3d.js` | arena e lottatori 3D, coreografia di ogni mossa (tabella `MOVES`) |
| `vendor/three.min.js` | Three.js r128 (grafica 3D), incluso così il gioco funziona anche offline |
| `img/` | carte originali ridimensionate; `img/volti/` i ritagli per le miniature; `img/teste/` i volti per le teste 3D |
| `tools/simulate.js` | simulatore di bilanciamento |
| `tools/livelli.js` | confronto tra i livelli di difficoltà |
| `tools/volti.py` | ritaglio delle miniature dalle carte |
| `tools/teste.py` | ritaglio dei volti per le teste 3D |
| `tools/tune.py` | piccolo aiuto per ritoccare i valori delle carte |

Per cambiare un valore basta modificare la carta in `engine.js` (per esempio `hp: 150, atk: 90, def: 75`) e rilanciare il simulatore.
