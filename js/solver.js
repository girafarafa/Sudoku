/**
 * solver.js
 * algoritmul de rezolvare (backtracking + MRV) si generatorul de puzzle-uri
 */

//---Solver principal-----------//

async function solve(board, onStep=null) {
    const cell = findMRVCell(board);
    if (!cell) return true;

    const { row, col } = cell;

    for (const num of board[row][col].candidates) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col].value = num;
            updateAllCandidates(board);

            if (onStep) await onStep(row, col, num, false);

            const solved = await solve(board, onStep);
            if (solved) return true;

            board[row][col].value = 0;
            updateAllCandidates(board);

            if (onStep) await onStep(row, col, 0, true);
        }
    }
    return false;
}

function solveSync(board) {
    const cell = findMRVCell(board);
    if (!cell) return true;

    const { row, col } = cell;
    const candidates = getCandidates(board, row, col);

    for (const num of candidates) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col].value = num;
            updateAllCandidates(board);

            if (solveSync(board)) return true;

            board[row][col].value = 0;
            updateAllCandidates(board);
        }
    }
    return false;
}

function findMRVCell(board) {
    let best = null;
    let minCandidates = 10;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c].value !== 0) continue;
            const count = board[r][c].candidates.size;

            if (count === 1) return { row: r, col: c };
            if (count === 0) return { row: r, col: c }; // dead-end: se raporteaza, nu se confunda cu "tabla completa"

            if (count < minCandidates) {
                minCandidates = count;
                best = { row: r, col: c };
            }
        }
    }
    return best;
}

//---Generator de puzzle-uri-----------//

/**
 * genereaza un puzzle valid cu solutie unica si distributie uniforma
 *
 * Strategie pentru distributie:
 * 1. seed diagonal: umple box-urile (0,0)(1,1)(2,2) cu cifre random
 *    (nu se influenteaza intre ele, pot fi umplute instant)
 * 2. solveSync completeaza restul tablei
 * 3. removeClues elimina cifre garantand MINIM minPerBox cifre
 *    in FIECARE din cele 9 box-uri 3x3 separat
 *
 * Dificultati calibrate:
 *   easy:   ~45 cifre, minim 4 per box  => puzzle relaxat, multe indicii
 *   medium: ~32 cifre, minim 2 per box  => necesita gandire, putine indicii
 *   hard:   ~24 cifre, minim 1 per box  => sparse, necesita tehnici avansate
 */
function generatePuzzle(difficulty) {
    const fullBoard = createEmptyBoard();
    seedDiagonalBoxes(fullBoard);
    solveSync(fullBoard);
    const solutionString = boardToString(fullBoard);

    const puzzleBoard = createEmptyBoard();
    loadPuzzle(puzzleBoard, solutionString);

    const params = {
        easy:   { totalClues: 45, minPerBox: 4 },
        medium: { totalClues: 32, minPerBox: 2 },
        hard:   { totalClues: 24, minPerBox: 1 },
    }[difficulty] || { totalClues: 45, minPerBox: 4 };

    removeClues(puzzleBoard, params.totalClues, params.minPerBox);

    return {
        puzzle: boardToString(puzzleBoard),
        solution: solutionString,
    };
}

/**
 * umple cele 3 box-uri diagonale cu cifre random
 * box (0,0), (1,1), (2,2) nu se influenteaza reciproc
 * da backtracking-ului puncte de start distribuite in tabla
 */
function seedDiagonalBoxes(board) {
    for (let box = 0; box < 3; box++) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
        let idx = 0;
        const startR = box * 3;
        const startC = box * 3;
        for (let r = startR; r < startR + 3; r++) {
            for (let c = startC; c < startC + 3; c++) {
                board[r][c].value = nums[idx++];
            }
        }
    }
    updateAllCandidates(board);
}

/**
 * returneaza un array cu cele 9 box-uri, fiecare ca lista de { row, col }
 * box-urile sunt indexate stanga-dreapta, sus-jos:
 * [0][1][2]
 * [3][4][5]
 * [6][7][8]
 */
function getAllBoxCells() {
    const boxes = [];
    for (let boxR = 0; boxR < 3; boxR++) {
        for (let boxC = 0; boxC < 3; boxC++) {
            const cells = [];
            for (let r = boxR * 3; r < boxR * 3 + 3; r++) {
                for (let c = boxC * 3; c < boxC * 3 + 3; c++) {
                    cells.push({ row: r, col: c });
                }
            }
            boxes.push(cells);
        }
    }
    return boxes;
}

/**
 * numara cate cifre sunt in box-ul care contine celula (row, col)
 */
function countBoxClues(board, row, col) {
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    let count = 0;
    for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
            if (board[r][c].value !== 0) count++;
        }
    }
    return count;
}

/**
 * elimina cifre din tabla respectand:
 * 1. totalClues  — minim de cifre ramase in toata tabla
 * 2. minPerBox   — minim de cifre in FIECARE din cele 9 box-uri
 * 3. solutie unica — verificata dupa fiecare eliminare
 *
 * Algoritmul lucreaza in doua faze:
 * Faza 1 — elimina uniform, cate o cifra din fiecare box pe rand
 *           pana cand fiecare box ajunge la minPerBox+1
 * Faza 2 — elimina aleator din toata tabla pana la totalClues
 *           (cu verificare minPerBox la fiecare pas)
 */
function removeClues(board, totalClues, minPerBox) {
    const boxes = getAllBoxCells();

    // Faza 1: elimina uniform din fiecare box
    // amestecam box-urile si celulele din fiecare box pentru varietate
    const shuffledBoxes = shuffle([...Array(9).keys()]);

    for (const boxIdx of shuffledBoxes) {
        const cells = shuffle([...boxes[boxIdx]]);
        // incearca sa scoti cifre din acest box pana ramai cu minPerBox+2
        // (lasam marja pentru faza 2)
        for (const { row, col } of cells) {
            if (board[row][col].value === 0) continue;
            if (countBoxClues(board, row, col) <= minPerBox + 2) break;

            const saved = board[row][col].value;
            board[row][col].value = 0;
            board[row][col].isGiven = false;
            updateAllCandidates(board);

            if (!hasUniqueSolution(board)) {
                board[row][col].value = saved;
                board[row][col].isGiven = true;
                updateAllCandidates(board);
            }
        }
    }

    // Faza 2: elimina aleator din toata tabla pana la totalClues
    let clues = countTotalClues(board);
    const allPositions = shuffle(
        Array.from({ length: 81 }, (_, i) => ({
            row: Math.floor(i / 9),
            col: i % 9,
        }))
    );

    for (const { row, col } of allPositions) {
        if (clues <= totalClues) break;
        if (board[row][col].value === 0) continue;
        if (countBoxClues(board, row, col) <= minPerBox) continue;

        const saved = board[row][col].value;
        board[row][col].value = 0;
        board[row][col].isGiven = false;
        updateAllCandidates(board);

        if (!hasUniqueSolution(board)) {
            board[row][col].value = saved;
            board[row][col].isGiven = true;
            updateAllCandidates(board);
        } else {
            clues--;
        }
    }
}

/**
 * numara total cifre ramase in tabla
 */
function countTotalClues(board) {
    let count = 0;
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (board[r][c].value !== 0) count++;
    return count;
}

/**
 * verifica daca tabla are exact o singura solutie
 */
function hasUniqueSolution(board) {
    let count = 0;

    function countSolutions(b) {
        const cell = findMRVCell(b);
        if (!cell) {
            count++;
            return count >= 2;
        }

        const { row, col } = cell;
        const candidates = getCandidates(b, row, col);

        for (const num of candidates) {
            if (isValidPlacement(b, row, col, num)) {
                b[row][col].value = num;
                updateAllCandidates(b);

                const shouldStop = countSolutions(b);

                b[row][col].value = 0;
                updateAllCandidates(b);

                if (shouldStop) return true;
            }
        }
        return false;
    }

    countSolutions(copyBoard(board));
    return count === 1;
}

//---Animatie solver-----------//

async function solveAnimated(boardEl, board, speedMs = 30) {
    const onStep = async (row, col, num, isBacktrack) => {
        updateCellDisplay(boardEl, board, row, col, false, null, null);
        const cellEl = getCellEl(boardEl, row, col);
        if (cellEl) {
            cellEl.classList.add(isBacktrack ? 'error' : 'hint-target');
            await delay(speedMs);
            cellEl.classList.remove('error', 'hint-target');
        }
    };

    await solve(board, onStep);
    renderAllCells(boardEl, board, false, null, null);
}

//---Utilitare-----------//

function boardToString(board) {
    return board.flat().map(cell => cell.value || '0').join('');
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}