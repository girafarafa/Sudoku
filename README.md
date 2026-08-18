# Sudoku

Joc de **Sudoku** in browser, scris in **JavaScript vanilla** (fara framework/build tool), cu generator de puzzle-uri, solver prin backtracking, sistem de hint-uri explicate ("de ce" logic, nu doar "ce cifra") si rezolvare animata pas cu pas.

## 🌐 Live Demo / Accesare Online

Jocul poate fi incercat direct in browser accesand linkul de mai jos:

👉 **[Joaca Sudoku online pe Vercel](https://vercel.com/girafa-rafa/sudoku)**

---

## Cuprins

- [Funcționalități Principale](#-funcționalități-principale)
- [Arhitectura](#arhitectura)
- [Structura proiectului](#structura-proiectului)
- [Cerinte](#cerinte)
- [Rulare](#rulare)
- [Detalii de implementare](#detalii-de-implementare)
- [Limitari cunoscute / TODO](#limitari-cunoscute--todo)

## ✨ Funcționalități Principale

**Tabla de joc**
- Tabla 9×9 randata dinamic in DOM, cu selectie de celula (click sau navigare cu sagetile).
- Completare cifre din numpad sau de la tastatura (1-9, Backspace/Delete/0 pentru stergere).
- Evidentiere automata a randului, coloanei si blocului 3×3 al celulei selectate, plus a celulelor cu aceeasi cifra.
- Detectare conflicte directe (aceeasi cifra pe rand/coloana/bloc) si verificare fata de solutia cunoscuta (`autoCheck`), cu marcaj vizual de eroare.
- Numpad-ul dezactiveaza automat cifrele deja plasate corect de 9 ori.

**Generare puzzle**
- 3 niveluri de dificultate (Usor / Mediu / Dificil), fiecare cu numar tinta de indicii si minim de indicii per bloc 3×3.
- Generare prin *seed* diagonal + backtracking (MRV) pentru tabla completa, apoi eliminare de cifre cu verificare de **solutie unica** dupa fiecare eliminare.

**Hint-uri**
- Sistem de hint pe celula selectata sau pe cea mai simpla celula disponibila, cu explicatie in limba romana.
- Tehnici, in ordinea complexitatii: **Naked Single** → **Hidden Single** (rand/coloana/bloc) → fallback ("Deductie avansata") din solutia pre-calculata.
- Evidentiere pe tabla a celulei tinta si a celulelor "sursa" care justifica deducerea.
- Contor de hint-uri folosite, afisat in header si in overlay-ul de victorie.

**Solve animat**
- Rezolvare pas cu pas folosind aceeasi ordine de tehnici ca la hint (om-like, nu doar backtracking brut), cu panou lateral care listeaza fiecare pas si explicatia lui.
- Animatie pe tabla la fiecare cifra plasata; poate fi oprita din mers.

**Alte functii**
- Toggle candidati: afiseaza mini-grid cu cifrele posibile in fiecare celula goala, plus sursele de eliminare pentru celula selectata.
- Undo (buton si `Ctrl/Cmd+Z`), pe baza unei stive de snapshot-uri ale valorilor tablei.
- Cronometru si overlay de victorie cu timp si nr. de hint-uri folosite.

## Arhitectura

```
        ┌───────────────┐
        │  index.html   │   ◄── layout, header, board, sidebar, overlay victorie
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │   game.js     │   ◄── controller: state, eventi, timer, undo, win, solve pas cu pas
        └───────┬───────┘
                │ foloseste
        ┌───────▼───────┐
        │   hints.js    │   ◄── detectie tehnica (Naked/Hidden Single) + explicatii
        └───────┬───────┘
                │ foloseste
        ┌───────▼───────┐
        │  solver.js    │   ◄── backtracking + MRV, generator de puzzle-uri, solutie unica
        └───────┬───────┘
                │ foloseste
        ┌───────▼───────┐
        │  board.js     │   ◄── model date (Cell), validare, candidati, rendering DOM
        └───────────────┘
```

**Principii de organizare:**
- **Separare model/rendering** — `board.js` tine atat structura de date (`board[row][col]` = obiect `Cell` cu `value`, `isGiven`, `candidates`, `isError`), cat si functiile de randare in DOM (`renderBoard`, `updateCellDisplay`, `renderAllCells`), dar nu are stare proprie de joc.
- **State central unic** — `game.js` detine singurul obiect `state` (tabla curenta, solutie, selectie, istoric undo, dificultate etc.); restul modulelor sunt functii pure care primesc `board` ca parametru.
- **Straturi succesive de dependenta** — `board.js` (fara dependente) → `solver.js` (foloseste board.js) → `hints.js` (foloseste board.js) → `game.js` (leaga totul si ataseaza evenimentele DOM). Ordinea de incarcare in `index.html` respecta exact acest lant.
- **Hint-uri reutilizate in solve animat** — `startSolveStepByStep()` din `game.js` apeleaza direct functiile de detectie tehnica din `hints.js` (`findNakedSingle`, `findHiddenSingleInRows/Cols/Boxes`, `getNextFromSolution`), asa incat pasii afisati animat sunt aceiasi pe care i-ar primi userul manual de la butonul Hint.

## Structura proiectului

```
├── index.html      # layout pagina: header (dificultate, timer, hints), board + numpad, sidebar (hint/solve/undo/legenda)
├── css/
│   └── style.css   # stilizare tabla, celule, highlight-uri, panouri, overlay victorie
└── js/
    ├── board.js    # model Cell, creare/incarcare/copiere tabla, validare, candidati, rendering DOM
    ├── solver.js   # backtracking + MRV (solve/solveSync), generator puzzle, verificare solutie unica
    ├── hints.js    # Naked Single, Hidden Single (rand/coloana/bloc), fallback din solutie
    └── game.js     # state global, evenimente, timer, undo, hint UI, solve pas cu pas, victorie
```

## Cerinte

- Un browser modern (suport ES6+: `Set`, arrow functions, `async/await`, template literals).
- Nu necesita build tool, bundler sau dependente externe — doar HTML/CSS/JS static.
- Conexiune la internet pentru fontul Google (`DM Sans` / `DM Mono`), incarcat din `index.html`.

## Rulare

Proiectul e static, deci se poate deschide direct sau servi cu orice server simplu:

```bash
# optiune 1: deschide direct
open index.html

# optiune 2: server local (recomandat, evita eventuale restrictii CORS)
python3 -m http.server 8000
# apoi acceseaza http://localhost:8000
```

Scripturile se incarca in ordinea `board.js` → `solver.js` → `hints.js` → `game.js`, iar `init()` din `game.js` porneste automat un joc nou la incarcarea paginii.

## Detalii de implementare

- **Model celula** (`board.js`): fiecare celula are `value` (0 = goala), `isGiven` (indiciu original, needitabil), `candidates` (`Set` recalculat dupa orice modificare prin `updateAllCandidates`) si `isError` (conflict direct, marcat de `validateBoard`).
- **Generator de puzzle** (`solver.js` → `generatePuzzle`): seed diagonal pe cele 3 blocuri independente (0,0)/(1,1)/(2,2), completare cu `solveSync` (backtracking + MRV), apoi `removeClues` elimina cifre in 2 faze — uniform pe fiecare bloc, apoi aleator pe toata tabla — verificand `hasUniqueSolution` dupa fiecare eliminare, cu praguri distincte de indicii/bloc per dificultate.
- **MRV (Minimum Remaining Values)**: `findMRVCell` alege mereu celula goala cu cei mai putini candidati posibili, ceea ce accelereaza semnificativ backtracking-ul fata de parcurgerea simpla stanga-dreapta.
- **Hint-uri explicate** (`hints.js`): fiecare tehnica returneaza nu doar cifra si celula, ci si lista de celule "sursa" (`highlightCells` cu `role: 'hint-source'`) care justifica de ce restul candidatilor au fost eliminati — folosita pentru evidentiere vizuala pe tabla.
- **Undo**: `pushHistory()` salveaza un snapshot simplu (array de 81 valori) inainte de fiecare plasare; `undo()` restaureaza doar celulele needitate (`!isGiven`), fara sa atinga indiciile originale.
- **Solve animat vs. hint manual**: ambele refolosesc aceleasi functii de detectie din `hints.js`, deci logica afisata userului e identica indiferent daca cere un hint sau porneste rezolvarea automata.

## Limitari cunoscute / TODO

- Solver-ul foloseste doar Naked Single, Hidden Single si backtracking brut ca fallback — tehnici mai avansate (Naked/Hidden Pairs, X-Wing etc.) nu sunt implementate, deci hint-urile pe puzzle-uri dificile ajung rapid la fallback-ul "Deductie avansata".
- `hasUniqueSolution` (verificata dupa fiecare eliminare de indiciu) are cost computational ridicat pe dificultatea "hard" — generarea unui puzzle greu poate dura vizibil mai mult decat "easy"/"medium".
- Nu exista persistenta a jocului curent (refresh de pagina = joc nou); timpul si progresul nu se salveaza local.
- Nu exista teste automate (unit tests) pentru `board.js` / `solver.js` / `hints.js`.
