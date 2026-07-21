# 🧩 Aplicație Web Sudoku

O aplicație web modernă, rapidă și interactivă de Sudoku, creată în JavaScript nativ (Vanilla JS), HTML5 și CSS3. Proiectul include un sistem inteligent de indicii (hint-uri), calcul automat al candidaților, modul de rezolvare vizuală pas cu pas și un generator avansat de puzzle-uri cu garanția unei soluții unice.

---
## 🌐 Live Demo / Accesare Online

Jocul poate fi încercat direct în browser accesând linkul de mai jos:

👉 **[Joacă Sudoku online pe Vercel](https://vercel.com/girafa-rafa/sudoku)**

---
## ✨ Funcționalități Principale

* **🎮 Experiență Interactivă de Joc:**
  * Interfață modernă, curată și responsive, optimizată pentru mobil și desktop.
  * Navigare ușoară din tastatură (săgeți, cifre, backspace).
  * Cronometru în timp real și contor pentru hint-urile folosite.
  * **Numpad inteligent:** Butoanele pentru cifre se dezactivează automat când o cifră a fost plasată corect de 9 ori pe tablă.
  * Verificare automată a greșelilor și evidențierea celulelor/cifrelor selectate.
  * Afișare/ascundere dinamică a grilei de candidați (pencilmorks).

* **💡 Engine Inteligent de Hint-uri:**
  * Analizează tabla în timp real pentru a recomanda următorul pas logic.
  * Explicații detaliate în limba română pentru tehnici umane de rezolvare, cu evidențiere vizuală pe tablă (celulă *Țintă* vs. celule *Sursă/Eliminatoare*):
    * **Naked Single:** Identifică celulele care mai au un singur candidat posibil.
    * **Hidden Single:** Evidențiază cifrele care pot sta într-un singur loc dintr-un rând, coloană sau bloc 3×3.
    * **Deducție Avansată:** Soluție de rezervă pentru stări complexe ale tablei.

* **⚙️ Rezolvare Pas cu Pas (Auto-Solver):**
  * Mod vizual de rezolvare animată care parcurge jocul pas cu pas.
  * Prioritizarea logicii umane (*Naked Single* $\rightarrow$ *Hidden Single* $\rightarrow$ *Backtracking*).
  * Panou dedicat cu istoricul tehnicilor aplicate la fiecare pas.

* **🎲 Generator Avansat & Niveluri de Dificultate:**
  * **3 Niveluri de Dificultate:** *Ușor* (~45 indicii), *Mediu* (~32 indicii) și *Dificil* (~24 indicii).
  * **Garanția Soluției Unice:** Algoritmul validează unicitatea soluției la fiecare cifră eliminată și asigură o distribuție uniformă a indiciilor în cele 9 blocuri 3×3.

---

## 🛠️ Tehnologii & Arhitectură

* **Frontend:** HTML5, CSS3 (Variabile CSS, Flexbox, Grid, tipografie adaptivă cu `clamp()`)
* **Logică:** Vanilla JavaScript (ES6+)
* **Fără dependențe externe:** Fără framework-uri sau biblioteci terțe — înrcărcare ultra-rapidă.

### Structura Fișierelor

```text
├── index.html          # Structura HTML principală și layout-ul UI
├── css/
│   └── style.css       # Sistemul de design, temele de culori și animațiile
└── js/
    ├── board.js        # Structuri de date, generare candidați și randare DOM
    ├── solver.js       # Algoritm Backtracking (MRV) și generatorul de puzzle-uri
    ├── hints.js        # Engine-ul de detectare a tehnicilor (Naked/Hidden Singles)
    └── game.js         # Starea aplicației, handler-e de evenimente și sincronizare UI
