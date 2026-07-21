/**
 * hints.js
 * 
 * sistemul de hints - detecteaza tehnica aplicabila si
 * explica logica matematica din spatele ei
 * 
 * TEHNICI IMPLEMENTATE (in ordine de complexitate):
 * 
 * 1. Naked Single
 *    o celula are un singur candidat posibil
 *    de ce? toate celelalte 8 cifre sunt eliminate de vecini
 * 
 * 2. Hidden Single
 *    o cifra poate sta intr-un singur loc dintr-un rand/col/box
 *    "hidden" = celula pare ca are multi candidati, dar pentru
 *    aceasta cifra specifica e singura optiune din unitate
 * 
 * 3. Fallback
 *    cand tehnicile simple nu se aplica, sugereaza urmatorul
 *    pas corect din solutia pre-calculata
 */

/**
 * gaseste urmatorul hint disponibil
 * incearca tehnicile in ordine de complexitate
 * 
 * @param {Array[][]} board - tabla curenta
 * @param {string} solution - solutia completa (string 81 chars)
 * @returns {object|null} - obiect hint sau null
 * 
 * Structura hint returnat:
 * {
 *   technique: string,           // 'Naked Single', 'Hidden Single', etc
 *   targetCell: { row, col },    // celula care poate fi completata
 *   value: number,               // cifra corecta
 *   explanation: string,         // explicatie in romana
 *   highlightCells: [            // celule de evidentiat pe tabla
 *     { row, col, role }         // role: 'hint-target' | 'hint-source'
 *   ]
 * }
 */
function getHint(board, solution) {
    // 1. incearca Naked Single
    const nakedSingle = findNakedSingle(board);
    if (nakedSingle) return nakedSingle;

    // 2. incearca Hidden Single pe randuri
    const hiddenRow = findHiddenSingleInRows(board);
    if (hiddenRow) return hiddenRow;

    // 3. incearca Hidden Single pe coloane
    const hiddenCol = findHiddenSingleInCols(board);
    if (hiddenCol) return hiddenCol;

    // 4. incearca Hidden Single in box-uri
    const hiddenBox = findHiddenSingleInBoxes(board);
    if (hiddenBox) return hiddenBox;

    // 5. fallback: urmatorul pas din solutia completa
    if (solution) return getNextFromSolution(board, solution);

    return null;
}

//---Naked Single-----------//

/**
 * cauta o celula cu exact 1 candidat posibil
 * 
 * de ce functioneaza: daca dintr-o celula au fost eliminate 8 cifre
 * de vecinii sai, singura cifra ramasa TREBUIE sa fie acolo
 */
function findNakedSingle(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c].value !== 0) continue;
            if (board[r][c].candidates.size !== 1) continue;

            const value = [...board[r][c].candidates][0];
            const eliminators = findEliminators(board, r, c, value);

            return {
                technique: 'Naked Single',
                targetCell: { row: r, col: c },
                value,
                explanation: buildNakedSingleExplanation(r, c, value),
                highlightCells: [
                    { row: r, col: c, role: 'hint-target' },
                    ...eliminators.map(e => ({ ...e, role: 'hint-source' })),
                ],
            };
        }
    }
    return null;
}

function buildNakedSingleExplanation(row, col, value) {
    const eliminated = [1,2,3,4,5,6,7,8,9].filter(n => n !== value);
    return (
        `Celula R${row+1}C${col+1} are un singur candidat posibil: ${value}. ` +
        `Cifrele ${eliminated.join(', ')} sunt eliminate de vecinii din ` +
        `același rând, coloană sau bloc 3×3.`
    );
}

/**
 * gaseste celulele care elimina candidatii din (row, col)
 * returneaza lista de { row, col } pentru highlight
 */
function findEliminators(board, row, col, value) {
    const result = [];
    const seen = new Set();

    const add = (r, c) => {
        const key = `${r},${c}`;
        if (seen.has(key)) return;
        if (r === row && c === col) return;
        if (board[r][c].value === 0) return; // celule goale nu elimina
        seen.add(key);
        result.push({ row: r, col: c });
    };

    // rand
    for (let c = 0; c < 9; c++) add(row, c);
    // coloana
    for (let r = 0; r < 9; r++) add(r, col);
    // box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++)
            add(r, c);

    return result;
}

//---Hidden Single-----------//

/**
 * Hidden Single pe randuri:
 * daca o cifra poate sta intr-un singur loc dintr-un rand,
 * acea cifra TREBUIE sa fie acolo
 * 
 * de ce? celelalte celule goale din rand nu o pot contine
 * (e deja in coloana/box-ul lor)
 */
function findHiddenSingleInRows(board) {
    for (let r = 0; r < 9; r++) {
        for (let num = 1; num <= 9; num++) {
            const possibleCols = [];
            for (let c = 0; c < 9; c++) {
                if (board[r][c].value === 0 && board[r][c].candidates.has(num)) {
                    possibleCols.push(c);
                }
            }
            if (possibleCols.length === 1) {
                const col = possibleCols[0];
                return buildHiddenSingleHint(board, r, col, num, 'rand', r);
            }
        }
    }
    return null;
}

/**
 * Hidden Single pe coloane
 */
function findHiddenSingleInCols(board) {
    for (let c = 0; c < 9; c++) {
        for (let num = 1; num <= 9; num++) {
            const possibleRows = [];
            for (let r = 0; r < 9; r++) {
                if (board[r][c].value === 0 && board[r][c].candidates.has(num)) {
                    possibleRows.push(r);
                }
            }
            if (possibleRows.length === 1) {
                const row = possibleRows[0];
                return buildHiddenSingleHint(board, row, c, num, 'coloana', c);
            }
        }
    }
    return null;
}

/**
 * Hidden Single in box-uri 3x3
 */
function findHiddenSingleInBoxes(board) {
    for (let boxR = 0; boxR < 3; boxR++) {
        for (let boxC = 0; boxC < 3; boxC++) {
            for (let num = 1; num <= 9; num++) {
                const possibleCells = [];
                for (let r = boxR * 3; r < boxR * 3 + 3; r++) {
                    for (let c = boxC * 3; c < boxC * 3 + 3; c++) {
                        if (board[r][c].value === 0 && board[r][c].candidates.has(num)) {
                            possibleCells.push({ row: r, col: c });
                        }
                    }
                }
                if (possibleCells.length === 1) {
                    const { row, col } = possibleCells[0];
                    return buildHiddenSingleHint(board, row, col, num, 'bloc', `${boxR * 3 + 1}-${boxR * 3 + 3}`);
                }
            }
        }
    }
    return null;
}

/**
 * construieste obiectul hint pentru un Hidden Single
 * @param {string} unitType - 'rand', 'coloana', sau 'bloc'
 * @param {number|string} unitIndex - indexul unitatii (pentru afisare)
 */
function buildHiddenSingleHint(board, row, col, value, unitType, unitIndex) {
    const unitName = unitType === 'rand'
        ? `Rândul ${unitIndex + 1}`
        : unitType === 'coloana'
        ? `Coloana ${unitIndex + 1}`
        : `Blocul ${unitIndex}`;

    const explanation =
        `${unitName} trebuie să conțină cifra ${value}, iar singura celulă ` +
        `din acest ${unitType} care o poate primi este R${row+1}C${col+1}. ` +
        `Deși celula pare să aibă mai mulți candidați, ${value} este eliminat ` +
        `din toate celelalte celule ale acestui ${unitType}. ` +
        `Tehnica: Hidden Single.`;

    // highlight celulele din unitate care blocheaza celelalte pozitii
    const highlightCells = [{ row, col, role: 'hint-target' }];

    if (unitType === 'rand') {
        for (let c = 0; c < 9; c++) {
            if (c !== col && board[row][c].value !== 0) {
                highlightCells.push({ row, col: c, role: 'hint-source' });
            }
        }
    } else if (unitType === 'coloana') {
        for (let r = 0; r < 9; r++) {
            if (r !== row && board[r][col].value !== 0) {
                highlightCells.push({ row: r, col, role: 'hint-source' });
            }
        }
    } else {
        // bloc
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
                if ((r !== row || c !== col) && board[r][c].value !== 0) {
                    highlightCells.push({ row: r, col: c, role: 'hint-source' });
                }
            }
        }
    }

    return { technique: 'Hidden Single', targetCell: { row, col }, value, explanation, highlightCells };
}

//---Fallback din solutie-----------//

/**
 * cand tehnicile simple nu se aplica (puzzle greu),
 * sugereaza cel mai bun urmator pas din solutia cunoscuta
 * alege celula cu cei mai putini candidati pentru a fi plauzibil
 */
function getNextFromSolution(board, solution) {
    let best = null;
    let minCandidates = 10;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c].value !== 0) continue;
            const count = board[r][c].candidates.size;
            if (count < minCandidates) {
                minCandidates = count;
                best = { row: r, col: c };
            }
        }
    }

    if (!best) return null;

    const { row, col } = best;
    const value = parseInt(solution[row * 9 + col]);

    return {
        technique: 'Deducție avansată',
        targetCell: { row, col },
        value,
        explanation:
            `Celula R${row+1}C${col+1} necesită tehnici avansate de analiză. ` +
            `Cifra corectă este ${value}. ` +
            `Încearcă să elimini candidații urmărind mai multe rânduri/coloane simultan.`,
        highlightCells: [{ row, col, role: 'hint-target' }],
    };
}