//***
// board.js
// structuri de date si rendering pentru tabla de sudoku
// fiecare celula e un obiect cu:
// - value: numarul din celula //0= goala, 1-9 cifra
// - isGiven: boolean //dat de puzzle, nu poate fi schimbat
// - candidates: set //cifrele posibile ( calcul dinamic )
// - isError: boolean //conflict cu alta celula
// */


//-----Structura de date ---------------//

/**
 * creez o tabla goala 9*9
 * returnez un array 2D board[row][col] = cell
 */
function createEmptyBoard() {
    const board = [];
    for (let r = 0; r < 9; r++) {      // BUG FIX: era r<0, tabla nu se crea niciodata
        board[r] = [];
        for (let c = 0; c < 9; c++) {
            board[r][c] = {
                value: 0,
                isGiven: false,
                candidates: new Set([1,2,3,4,5,6,7,8,9]),
                isError: false,
            };
        }
    }
    return board;
}

/**
 * incarca un puzzle dintr-un string de 81 de caractere
 * '0' sau '.' = celula goala, '1'-'9' = cifra data
 * exemplu: '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
 */
function loadPuzzle(board, puzzleString) {
    let idx = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const ch = puzzleString[idx++];
            const val = (ch === '0' || ch === '.') ? 0 : parseInt(ch);
            board[r][c].value = val;
            board[r][c].isGiven = (val !== 0);
            board[r][c].isError = false;
        }
    }
    updateAllCandidates(board);
}

/**
 * copiaza o tabla (deep copy)
 * util pentru solver si undo
 */
function copyBoard(board) {
    return board.map(row => row.map(cell => ({
        value: cell.value,
        isGiven: cell.isGiven,
        candidates: new Set(cell.candidates),
        isError: cell.isError,
    })));
}


//-----Validare----------

/**
 * returneaza true daca 'num' poate fi plasat la (row, col)
 * verifica rand, coloana si box 3*3
 */
function isValidPlacement(board, row, col, num) {
    // verific randul
    for (let c = 0; c < 9; c++) {
        if (c !== col && board[row][c].value === num)
            return false;
    }

    // verific coloana
    for (let r = 0; r < 9; r++) {
        if (r !== row && board[r][col].value === num)
            return false;
    }

    // verific box 3*3
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;

    for (let r = boxRowStart; r < boxRowStart + 3; r++) {   // BUG FIX: era boxRow+3 (variabila inexistenta)
        for (let c = boxColStart; c < boxColStart + 3; c++) {
            if ((r !== row || c !== col) && board[r][c].value === num)
                return false;
        }
    }
    return true;
}

/**
 * calculeaza candidatii pentru celula (row, col)
 * returneaza un Set cu cifrele posibile
 */
function getCandidates(board, row, col) {
    if (board[row][col].value !== 0)
        return new Set(); // celula deja completata

    const candidates = new Set([1,2,3,4,5,6,7,8,9]);

    // elimina cifrele din acelasi rand
    for (let c = 0; c < 9; c++) {
        candidates.delete(board[row][c].value);
    }

    // elimina cifrele din aceeasi coloana
    for (let r = 0; r < 9; r++) {
        candidates.delete(board[r][col].value);
    }

    // elimina cifrele din acelasi box 3*3
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    for (let r = boxRowStart; r < boxRowStart + 3; r++) {
        for (let c = boxColStart; c < boxColStart + 3; c++) {
            candidates.delete(board[r][c].value);
        }
    }
    return candidates;
}

/**
 * recalculeaza candidatii pentru toate celulele
 * apelat dupa orice schimbare in tabla
 */
function updateAllCandidates(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            board[r][c].candidates = getCandidates(board, r, c);
        }
    }
}

/**
 * marcheaza celulele cu erori (conflicte directe)
 * returneaza nr de erori gasite
 */
function validateBoard(board) {
    // resetez erorile
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            board[r][c].isError = false;

    let errors = 0;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = board[r][c].value;
            if (val === 0) continue;
            if (!isValidPlacement(board, r, c, val)) {
                board[r][c].isError = true;
                errors++;
            }
        }
    }
    return errors;
}

/**
 * returneaza true daca tabla e complet si corect completata
 */
function isBoardSolved(board) {
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (board[r][c].value === 0 || board[r][c].isError)
                return false;
    return true;
}


//-----Rendering------------------//

/**
 * genereaza toate cele 81 de celule si le insereaza in DOM
 * apelat o singura data la initializare
 */
function renderBoard(boardEl) {                      // BUG FIX: parametru boardEl, nu board
    boardEl.innerHTML = '';                          // BUG FIX: era isBoardSolved.innerHtml (functie, nu element)

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('tabindex', '0');
            boardEl.appendChild(cell);              // BUG FIX: era boardEL cu L mare (variabila inexistenta)
        }
    }
}

/**
 * actualizeaza vizual o singura celula in DOM
 * apelat dupa orice modificare (mai eficient decat re-render complet)
 */
function updateCellDisplay(boardEl, board, row, col, showCandidates, selectedRow, selectedCol) {
    const cellEl = getCellEl(boardEl, row, col);
    if (!cellEl) return;

    const cell = board[row][col];
    const classes = ['cell'];

    if (cell.isGiven) classes.push('given');
    if (cell.isError) classes.push('error');

    // highlight: celula selectata
    const isSelected = (row === selectedRow && col === selectedCol);
    if (isSelected) classes.push('selected');

    // highlight: acelasi rand, coloana, box cu celula selectata
    if (selectedRow !== null && !isSelected) {
        const sameRow = (row === selectedRow);
        const sameCol = (col === selectedCol);
        const sameBox = (
            Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
            Math.floor(col / 3) === Math.floor(selectedCol / 3)
        );
        if (sameRow || sameCol || sameBox)
            classes.push('highlighted');
    }

    // highlight: aceeasi cifra ca selectia
    if (selectedRow !== null && !isSelected) {
        const selVal = board[selectedRow][selectedCol].value;
        if (selVal !== 0 && cell.value === selVal)
            classes.push('same-number');
    }

    cellEl.className = classes.join(' ');

    // continut celula
    if (cell.value !== 0) {
        cellEl.textContent = cell.value;
        cellEl.setAttribute('aria-label', `Rand ${row+1}, coloana ${col+1}: ${cell.value}${cell.isGiven ? ' (dat)' : ''}`);
    } else if (showCandidates && cell.candidates.size > 0) {
        cellEl.textContent = '';
        cellEl.setAttribute('aria-label', `Rand ${row+1}, coloana ${col+1}: gol`);
        const grid = document.createElement('div');
        grid.className = 'candidates';
        for (let n = 1; n <= 9; n++) {
            const span = document.createElement('span');
            span.className = 'candidate' + (cell.candidates.has(n) ? ' active' : ''); // BUG FIX: era classListName
            span.textContent = cell.candidates.has(n) ? n : '';
            grid.appendChild(span);
        }
        cellEl.appendChild(grid);
    } else {
        cellEl.textContent = '';
        cellEl.setAttribute('aria-label', `Rand ${row+1}, coloana ${col+1}: gol`);
    }
}

/**
 * re-randeaza toata tabla
 * apelat dupa new game sau undo complet
 */
function renderAllCells(boardEl, board, showCandidates, selectedRow, selectedCol) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            updateCellDisplay(boardEl, board, r, c, showCandidates, selectedRow, selectedCol);
        }
    }
}


//------HELPERS ------------------//

function getCellEl(boardEl, row, col) {
    return boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

/**
 * evidentiaza o lista de celule cu clase hint-target / hint-source
 * sterge highlight-urile anterioare inainte
 */
function highlightHintCells(boardEl, cells, type = 'hint-target') {
    // sterge toate highlight-urile anterioare
    boardEl.querySelectorAll('.hint-target, .hint-source').forEach(el => {
        el.classList.remove('hint-target', 'hint-source');
    });

    cells.forEach(({ row, col, role }) => {          // BUG FIX: destructureaza si 'role'
        const el = getCellEl(boardEl, row, col);
        if (el) el.classList.add(role || type);
    });
}