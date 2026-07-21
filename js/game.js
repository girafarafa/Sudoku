/**
 * game.js
 * 
 * controller principal - leaga toate modulele impreuna
 * citeste board.js → solver.js → hints.js inainte de asta
 */

//---State-----------//
// singura sursa de adevar despre joc
// nu modifica direct din afara functiilor

const state = {
    board: null,          // Array 9x9 de Cell objects
    solution: null,       // string 81 chars - solutia completa
    selected: null,       // { row, col } sau null
    showCandidates: false,
    history: [],          // stiva undo - array de snapshots
    difficulty: 'easy',
    hintsUsed: 0,
    startTime: null,
    timerInterval: null,
    solving: false,       // true cand e activ solve animat
    autoCheck: true,      // marcheaza greseli fata de solutie instant
};

//---Elemente DOM-----------//

const boardEl       = document.getElementById('board');
const timerEl       = document.getElementById('timer');
const hintCountEl   = document.getElementById('hint-count');
const hintPanel     = document.getElementById('hint-panel');
const hintTextEl    = document.getElementById('hint-text');
const solvePanel    = document.getElementById('solve-panel');
const solveStepsEl  = document.getElementById('solve-steps');
const winOverlay    = document.getElementById('win-overlay');
const winTimeEl     = document.getElementById('win-time');
const winHintsEl    = document.getElementById('win-hints');

const btnNew        = document.getElementById('btn-new');
const btnWinNew     = document.getElementById('btn-win-new');
const btnHint       = document.getElementById('btn-hint');
const btnCandidates = document.getElementById('btn-candidates');
const btnSolve      = document.getElementById('btn-solve');
const btnUndo       = document.getElementById('btn-undo');
const diffBtns      = document.querySelectorAll('.diff-btn');
const numBtns       = document.querySelectorAll('.num-btn');

//---Init-----------//

function init() {
    renderBoard(boardEl);  // creeaza cele 81 de celule in DOM (board.js)
    attachEvents();
    startNewGame();
}

//---Joc nou-----------//

function startNewGame() {
    stopTimer();
    state.history        = [];
    state.selected       = null;
    state.showCandidates = false;
    state.hintsUsed      = 0;
    state.solving        = false;

    // reseteaza UI
    btnCandidates.classList.remove('active');
    btnSolve.classList.remove('active');
    hintPanel.classList.remove('has-hint');
    hintTextEl.textContent = 'Selectează o celulă și apasă Hint pentru a vedea logica din spatele următorului pas.';
    solvePanel.classList.remove('visible');
    solvePanel.setAttribute('aria-hidden', 'true');
    solveStepsEl.innerHTML = '';
    winOverlay.classList.remove('visible');
    winOverlay.setAttribute('aria-hidden', 'true');
    highlightHintCells(boardEl, []);

    // genereaza puzzle nou
    const { puzzle, solution } = generatePuzzle(state.difficulty);
    state.solution = solution;
    state.board    = createEmptyBoard();
    loadPuzzle(state.board, puzzle);

    renderAllCells(boardEl, state.board, false, null, null);
    hintCountEl.textContent = '0';
    updateNumpadState();
    startTimer();
}

//---Timer-----------//

function startTimer() {
    state.startTime    = Date.now();
    state.timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function stopTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
}

function updateTimer() {
    if (!state.startTime) return;
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    timerEl.textContent = formatTime(elapsed);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

//---Selectie celula-----------//

function selectCell(row, col) {
    state.selected = { row, col };
    highlightHintCells(boardEl, []); // sterge highlight-urile de hint
    renderAllCells(boardEl, state.board, state.showCandidates, row, col);

    // daca modul candidati e activ, arata sursele de eliminare
    if (state.showCandidates) {
        showCandidateSources(row, col);
    }
}

function clearSelection() {
    state.selected = null;
    renderAllCells(boardEl, state.board, state.showCandidates, null, null);
}

//---Plasare cifra-----------//

function placeNumber(num) {
    if (!state.selected || state.solving) return;
    const { row, col } = state.selected;
    const cell = state.board[row][col];

    if (cell.isGiven) return;           // celule date nu se modifica
    if (cell.value === num) return;     // aceeasi valoare, nimic de facut

    // salveaza starea pentru undo INAINTE de modificare
    pushHistory();

    cell.value = num;
    updateAllCandidates(state.board);

    // verifica conflicte directe (rand/col/box)
    validateBoard(state.board);

    // verifica greseli logice fata de solutie (daca autoCheck e activ)
    if (num !== 0 && state.autoCheck && state.solution) {
        const correctVal = parseInt(state.solution[row * 9 + col]);
        if (num !== correctVal) {
            cell.isError = true;
        }
    }

    renderAllCells(boardEl, state.board, state.showCandidates, row, col);
    updateNumpadState();

    // sterge hint-ul activ - s-a schimbat tabla
    hintPanel.classList.remove('has-hint');
    highlightHintCells(boardEl, []);

    if (num !== 0 && isBoardSolved(state.board)) {
        onWin();
    }
}

//---Undo-----------//

/**
 * salveaza un snapshot al valorilor curente in stiva
 * apelat INAINTE de orice modificare a board-ului
 */
function pushHistory() {
    // snapshot = array de 81 de valori (doar numerele)
    const snapshot = state.board.flat().map(c => c.value);
    state.history.push(snapshot);

    if (state.history.length > 50) state.history.shift(); // limita memorie
}

/**
 * restaureaza ultimul snapshot din stiva
 */
function undo() {
    if (state.history.length === 0 || state.solving) return;

    const snapshot = state.history.pop();

    snapshot.forEach((val, idx) => {
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        if (!state.board[r][c].isGiven) {
            state.board[r][c].value = val;
        }
    });

    updateAllCandidates(state.board);
    validateBoard(state.board);
    highlightHintCells(boardEl, []);
    hintPanel.classList.remove('has-hint');

    renderAllCells(
        boardEl, state.board, state.showCandidates,
        state.selected?.row ?? null,
        state.selected?.col ?? null
    );
    updateNumpadState();
}

//---Numpad disabled-----------//

/**
 * dupa fiecare plasare, numara aparitiile fiecarei cifre
 * daca o cifra apare de 9 ori corect => butonul ei devine disabled
 */
function updateNumpadState() {
    const counts = new Array(10).fill(0); // index 1-9

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = state.board[r][c];
            if (cell.value !== 0 && !cell.isError) {
                counts[cell.value]++;
            }
        }
    }

    numBtns.forEach(btn => {
        const num = parseInt(btn.dataset.num);
        if (!num) return; // butonul X (data-num="0")
        if (counts[num] >= 9) {
            btn.classList.add('disabled');
            btn.setAttribute('aria-disabled', 'true');
        } else {
            btn.classList.remove('disabled');
            btn.removeAttribute('aria-disabled');
        }
    });
}

//---Candidati - surse de eliminare-----------//

/**
 * cand modul candidati e activ si selectezi o celula,
 * evidentiaza celulele care elimina candidati din ea
 * 
 * pentru fiecare cifra care NU e candidat, gaseste cine o elimina
 * si marcheaza cu hint-source
 */
function showCandidateSources(row, col) {
    const cell = state.board[row][col];
    if (cell.value !== 0) return;

    const candidates = cell.candidates;
    const toHighlight = [];
    const seen = new Set();

    const add = (r, c) => {
        const key = `${r},${c}`;
        if (seen.has(key)) return;
        seen.add(key);
        toHighlight.push({ row: r, col: c, role: 'hint-source' });
    };

    // pentru fiecare cifra eliminata, gaseste sursa eliminarii
    for (let num = 1; num <= 9; num++) {
        if (candidates.has(num)) continue; // e candidat valid

        // sursa din rand
        for (let c = 0; c < 9; c++) {
            if (c !== col && state.board[row][c].value === num) add(row, c);
        }
        // sursa din coloana
        for (let r = 0; r < 9; r++) {
            if (r !== row && state.board[r][col].value === num) add(r, col);
        }
        // sursa din box
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
                if ((r !== row || c !== col) && state.board[r][c].value === num) add(r, c);
            }
        }
    }

    highlightHintCells(boardEl, toHighlight);
}

//---Hint-----------//

function showHint() {
    if (state.solving) return;

    let hint = null;

    if (state.selected) {
        // celula selectata => analizeaza specific acea celula
        const { row, col } = state.selected;
        const cell = state.board[row][col];

        if (cell.value !== 0) {
            hintTextEl.textContent = 'Această celulă este deja completată. Selectează una goală.';
            hintPanel.classList.remove('has-hint');
            return;
        }

        hint = getHintForCell(state.board, row, col, state.solution);

        if (!hint) {
            hintTextEl.textContent =
                'Această celulă necesită tehnici avansate. ' +
                'Încearcă altă celulă sau lasă hint-ul să aleagă automat (deselectează celula).';
            hintPanel.classList.remove('has-hint');
            return;
        }
    } else {
        // nimic selectat => gaseste cea mai usoara celula disponibila
        hint = getHint(state.board, state.solution);
    }

    if (!hint) {
        hintTextEl.textContent = 'Nu am găsit un hint. Verifică dacă tabla nu are erori.';
        hintPanel.classList.remove('has-hint');
        return;
    }

    state.hintsUsed++;
    hintCountEl.textContent = state.hintsUsed;

    hintTextEl.textContent = `[${hint.technique}] ${hint.explanation}`;
    hintPanel.classList.add('has-hint');

    selectCell(hint.targetCell.row, hint.targetCell.col);
    highlightHintCells(boardEl, hint.highlightCells);
}

/**
 * analizeaza o celula specifica si returneaza hint
 * daca se aplica o tehnica simpla (Naked sau Hidden Single)
 * returneaza null daca necesita tehnici avansate
 */
function getHintForCell(board, row, col, solution) {
    // Naked Single?
    if (board[row][col].candidates.size === 1) {
        const value = [...board[row][col].candidates][0];
        return {
            technique: 'Naked Single',
            targetCell: { row, col },
            value,
            explanation:
                `Celula R${row+1}C${col+1} are un singur candidat posibil: ${value}. ` +
                `Toate celelalte cifre sunt eliminate de vecinii din rând, coloană sau bloc.`,
            highlightCells: [
                { row, col, role: 'hint-target' },
                ...findEliminators(board, row, col, value).map(e => ({ ...e, role: 'hint-source' })),
            ],
        };
    }

    // Hidden Single pe aceasta celula?
    if (solution) {
        const correctVal = parseInt(solution[row * 9 + col]);
        if (!board[row][col].candidates.has(correctVal)) return null;

        // verifica randul
        const inRow = [];
        for (let c = 0; c < 9; c++) {
            if (board[row][c].value === 0 && board[row][c].candidates.has(correctVal)) inRow.push(c);
        }
        if (inRow.length === 1) return buildHiddenSingleHint(board, row, col, correctVal, 'rand', row);

        // verifica coloana
        const inCol = [];
        for (let r = 0; r < 9; r++) {
            if (board[r][col].value === 0 && board[r][col].candidates.has(correctVal)) inCol.push(r);
        }
        if (inCol.length === 1) return buildHiddenSingleHint(board, row, col, correctVal, 'coloana', col);

        // verifica box
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        const inBox = [];
        for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
                if (board[r][c].value === 0 && board[r][c].candidates.has(correctVal)) inBox.push({ r, c });
            }
        }
        if (inBox.length === 1) return buildHiddenSingleHint(board, row, col, correctVal, 'bloc', `${br+1}-${br+3}`);
    }

    return null;
}

//---Solve pas cu pas-----------//

/**
 * rezolva tabla pas cu pas cu gandire umana:
 * prioritate: Naked Single => Hidden Single => fallback din solutie
 * fiecare pas apare in #solve-panel cu explicatie
 */
async function startSolveStepByStep() {
    if (state.solving) {
        state.solving = false;
        btnSolve.classList.remove('active');
        return;
    }

    state.solving = true;
    btnSolve.classList.add('active');
    solvePanel.classList.add('visible');
    solvePanel.setAttribute('aria-hidden', 'false');
    solveStepsEl.innerHTML = '';
    stopTimer();
    clearSelection();

    let stepCount = 0;
    const MAX_STEPS = 200;

    while (!isBoardSolved(state.board) && stepCount < MAX_STEPS && state.solving) {
        stepCount++;

        // prioritizeaza tehnicile umane
        let hint = findNakedSingle(state.board);
        if (!hint) hint = findHiddenSingleInRows(state.board);
        if (!hint) hint = findHiddenSingleInCols(state.board);
        if (!hint) hint = findHiddenSingleInBoxes(state.board);
        if (!hint) hint = getNextFromSolution(state.board, state.solution);

        if (!hint) break;

        // aplica pasul
        const { row, col } = hint.targetCell;
        state.board[row][col].value = hint.value;
        updateAllCandidates(state.board);

        // adauga pas in panou
        addSolveStep(hint, stepCount);

        // animatie pe tabla
        renderAllCells(boardEl, state.board, false, row, col);
        const cellEl = getCellEl(boardEl, row, col);
        if (cellEl) {
            cellEl.classList.add('hint-target');
            await delay(500);
            cellEl.classList.remove('hint-target');
        }

        await delay(150);
    }

    if (isBoardSolved(state.board)) {
        renderAllCells(boardEl, state.board, false, null, null);
        onWin();
    }

    state.solving = false;
    btnSolve.classList.remove('active');
}

/**
 * adauga un pas in panoul de rezolvare
 * pasul anterior devine .done, cel nou e .active
 */
function addSolveStep(hint, stepNumber) {
    const prevActive = solveStepsEl.querySelector('.solve-step.active');
    if (prevActive) prevActive.classList.replace('active', 'done');

    const step = document.createElement('div');
    step.className = 'solve-step active';
    step.innerHTML = `
        <span class="solve-step-technique">${hint.technique} — Pasul ${stepNumber}</span>
        ${hint.explanation}
    `;
    solveStepsEl.appendChild(step);
    step.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

//---Win-----------//

function onWin() {
    stopTimer();
    const elapsed = state.startTime
        ? Math.floor((Date.now() - state.startTime) / 1000)
        : 0;
    winTimeEl.textContent = formatTime(elapsed);
    winHintsEl.textContent = state.hintsUsed;
    winOverlay.classList.add('visible');
    winOverlay.setAttribute('aria-hidden', 'false');
}

//---Events-----------//

function attachEvents() {

    // click pe celula din board
    boardEl.addEventListener('click', e => {
        if (state.solving) return;
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;
        const row = parseInt(cellEl.dataset.row);
        const col = parseInt(cellEl.dataset.col);

        // click pe aceeasi celula = deselecteaza
        if (state.selected?.row === row && state.selected?.col === col) {
            clearSelection();
        } else {
            selectCell(row, col);
        }
    });

    // numpad
    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled')) return;
            placeNumber(parseInt(btn.dataset.num));
        });
    });

    // tastatura
    document.addEventListener('keydown', e => {
        if (state.solving) return;

        if (e.key >= '1' && e.key <= '9') {
            placeNumber(parseInt(e.key));
            return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            placeNumber(0);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
            return;
        }

        // navigare cu sageti
        if (!state.selected) return;
        const { row, col } = state.selected;
        const arrows = {
            ArrowUp:    [-1,  0],
            ArrowDown:  [ 1,  0],
            ArrowLeft:  [ 0, -1],
            ArrowRight: [ 0,  1],
        };
        if (arrows[e.key]) {
            e.preventDefault();
            const [dr, dc] = arrows[e.key];
            selectCell(
                Math.max(0, Math.min(8, row + dr)),
                Math.max(0, Math.min(8, col + dc))
            );
        }
    });

    // butoane principale
    btnNew.addEventListener('click', startNewGame);
    btnWinNew.addEventListener('click', startNewGame);
    btnHint.addEventListener('click', showHint);
    btnUndo.addEventListener('click', undo);
    btnSolve.addEventListener('click', startSolveStepByStep);

    // toggle candidati
    btnCandidates.addEventListener('click', () => {
        state.showCandidates = !state.showCandidates;
        btnCandidates.classList.toggle('active', state.showCandidates);
        renderAllCells(
            boardEl, state.board, state.showCandidates,
            state.selected?.row ?? null,
            state.selected?.col ?? null
        );
        if (state.showCandidates && state.selected) {
            showCandidateSources(state.selected.row, state.selected.col);
        } else {
            highlightHintCells(boardEl, []);
        }
    });

    // dificultate
    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.level;
            startNewGame();
        });
    });
}

//---Start-----------//
init();