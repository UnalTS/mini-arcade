# Mini Arcade verstehen – ein Tutorial für den Einstieg

Dieses Tutorial führt dich durch das Projekt, ohne React- oder TypeScript-Erfahrung vorauszusetzen. Starte zuerst die App mit den Befehlen aus der README und öffne während des Lesens die genannten Dateien im Editor.

## 1. Was passiert, wenn du die Seite öffnest?

Der Browser lädt `index.html`. Darin gibt es ein leeres Element mit `id="root"` und einen Verweis auf `src/main.tsx`. Diese Datei ruft React auf und sagt: „Zeige die Komponente `App` innerhalb von `root`.“ React erzeugt daraus die sichtbaren HTML-Elemente. Eine _Komponente_ ist hier einfach eine Funktion, die beschreibt, was auf dem Bildschirm erscheinen soll.

Vite ist das Entwicklungswerkzeug dazwischen: `npm.cmd run dev` startet einen lokalen Webserver. Bei Änderungen lädt es die betroffenen Teile der Seite neu. `npm.cmd run build` prüft TypeScript und erzeugt optimierte Dateien in `dist/`. Diese können später auf einem statischen Webhost liegen.

**Übung:** Ändere den Einleitungssatz in `src/i18n.ts`, speichere und beobachte die Seite im Browser. Du musst den Server nicht neu starten.

## 2. Wie arbeitet React mit Zustand?

„Zustand“ bedeutet die Daten, die sich während der Nutzung ändern: beispielsweise die Zahlen eines Sudoku-Bretts oder die gesetzten Flaggen. In `App.tsx` wird der gemeinsame Zustand mit `useState(readStore)` angelegt. `readStore` liest beim Start einen vorhandenen Spielstand aus dem Browser. `setStore` gibt React einen neuen Zustand und löst eine Aktualisierung der Ansicht aus.

Ein typisches Muster sieht so aus:

```ts
setStore((current) => ({ ...current, language: "en" }));
```

`current` ist der bisherige Zustand. `{ ...current }` übernimmt seine bisherigen Felder; `language: 'en'` ersetzt nur die Sprache. Dieses Kopieren ist wichtig: React erkennt Änderungen zuverlässig, wenn du neue Objekte erzeugst, statt vorhandene Objekte still zu verändern.

Die `App`-Komponente stellt den Zustand den Seiten über einen React-Kontext bereit. Dadurch müssen Sprache, Design und Ergebnisse nicht durch jede Zwischenkomponente als zusätzliche Parameter weitergereicht werden.

**Übung:** Suche in `App.tsx` den Sprachschalter. Verfolge vom `onChange`-Ereignis bis zu `translate`, warum sich ein Knopftext sofort ändert.

## 3. Was leistet TypeScript?

JavaScript führt den Code aus. TypeScript prüft vorher, ob Daten und Funktionsaufrufe zusammenpassen. Ein Beispiel ist `MineLevel` in `src/games/minesweeper.ts`: Der Typ erlaubt nur `beginner`, `intermediate` und `expert`. Wenn du dich bei einem Namen vertippst, meldet der Editor einen Fehler. Die fertige Website enthält später normales JavaScript; die Typen dienen Entwicklung und Prüfung.

Die Spielzustände sind ebenfalls beschrieben: `SudokuGame` enthält etwa `puzzle` (fest vorgegebene Zahlen), `solution` (Lösung), `values` (aktuelle Eingaben), `errors`, `hints`, `elapsed` und `status`. Diese Unterscheidung verhindert, dass eine vom Spieler eingegebene Zahl versehentlich als unveränderbare Vorgabe behandelt wird.

**Übung:** Ersetze probeweise in einem neuen, nicht gespeicherten Editorentwurf `newMineGame('beginner')` durch `newMineGame('tiny')`. Lies die Typfehlermeldung und verwirf die Änderung wieder.

## 4. Warum liegen die Regeln in eigenen Dateien?

Die Spiellogik in `src/games/` hat keine Kenntnis von Farben oder React. `enterSudoku(game, index, value)` berechnet aus einer Partie und einer Eingabe eine neue Partie. Die Oberfläche entscheidet anschließend nur noch, wie dieser Zustand aussieht. Diese Trennung hat zwei Vorteile: Die Regeln sind einfacher zu verstehen, und Tests können sie ohne Browser aufrufen.

### Sudoku Schritt für Schritt

1. `solvedBoard` erstellt ein gültiges vollständig gefülltes Brett. Reihen, Spalten, Zahlen und 3×3-Blöcke werden zufällig vertauscht.
2. `generateSudoku` entfernt Zahlen. Nach jeder Entfernung prüft `countSolutions`, ob genau eine Lösung übrig bleibt. Mehrere Lösungen würden ein unfair unbestimmtes Rätsel ergeben.
3. `ratePuzzle` versucht das Rätsel mit nachvollziehbaren Schritten zu lösen. Es trennt die Stufen nach benötigten Einzelkandidaten und weiteren Kandidatenausschlüssen. „Schwer“ bedeutet hier: Die implementierten einfacheren Strategien reichen nicht aus. Es ist keine Bewertung jeder denkbaren menschlichen Sudoku-Technik.
4. Der Web Worker führt diese Suche außerhalb des Hauptthreads aus. Währenddessen kann die Seite einen Ladezustand anzeigen, ohne dass der Browser einfriert.
5. `enterSudoku` übernimmt eine Zahl oder Notiz, zählt falsche Werte und erkennt Sieg oder Niederlage. `undoSudoku` stellt die vorherige Eingabe wieder her, lässt gezählte Fehler aber bestehen. `hintSudoku` setzt eine korrekte Zahl ein und erhöht den Hilfenzähler.

Ein Beispiel für einen Test: Erzeuge ein Rätsel, rufe `countSolutions` auf und erwarte `count === 1`. Dadurch testest du eine Eigenschaft des Rätsels, statt nur zu prüfen, ob eine Funktion überhaupt einen Wert zurückgibt.

### Minesweeper Schritt für Schritt

1. `newMineGame` erstellt ein leeres Brett. Minen werden bewusst noch nicht verteilt.
2. Beim ersten Aufdecken legt `placeMines` die Minen nur außerhalb des gewählten Felds und seiner Nachbarn. So ist der erste Zug sicher.
3. `neighbors` berechnet angrenzende Felder. `flood` deckt von einem leeren Feld aus zusammenhängende sichere Bereiche auf.
4. `toggleFlag` markiert ein verdecktes Feld. `chordMine` deckt angrenzende Felder auf, wenn ihre Flaggenzahl zur Zahl auf einem bereits offenen Feld passt. Falsch gesetzte Flaggen können dabei zu einer Niederlage führen.
5. Ein Sieg liegt vor, wenn alle Felder ohne Mine offen sind. Flaggen müssen dafür nicht perfekt gesetzt sein.

**Übung:** Lies in `minesweeper.test.ts` den Test des ersten Zuges. Ändere gedanklich die Testdaten auf ein mittleres Feld: Welche Indizes müssten dann garantiert minenfrei sein?

### Nonogram und Snake

Ein Nonogram-Bild ist ein Raster aus gefüllten und leeren Feldern. `runs` zählt die Länge jeder zusammenhängenden Gruppe und erzeugt daraus die Hinweise am Rand. `solveByLogic` betrachtet für jede Zeile und Spalte alle Muster, die zu ihren Hinweisen passen. Ein Feld wird nur dann festgelegt, wenn alle verbleibenden Muster dort übereinstimmen. Kann diese Wiederholung das ganze Raster bestimmen, ist das Rätsel ohne Raten lösbar. Die zufällige Erzeugung läuft in `nonogram.worker.ts`; die 18 handgestalteten Bilder stehen in `nonogram.ts`. Die Spielseite liegt in `ExtraGames.tsx`.

Bei Snake ist ein Feld einfach eine Zahl von 0 bis 399. `stepSnake` berechnet aus dem bisherigen Körper und der Richtung den nächsten Zustand. Sie prüft zuerst die Wand, dann den Körper, dann den Apfel. Beim normalen Schritt verschwindet das letzte Körperglied; nach einem Apfel bleibt es stehen und die Schlange wächst. Das Tempo hängt von der Zahl gefressener Äpfel ab, nicht von der Bildwiederholrate des Monitors.

**Übung:** Suche `snakeInterval(4)` und `snakeStage(4)` in den Tests. Erkläre, warum beide nach dem vierten Apfel einen höheren Schwierigkeitsgrad beschreiben.

## 5. Wie bleiben Spiele nach dem Neuladen erhalten?

`src/store.ts` schreibt den Zustand als JSON in `localStorage`. JSON ist eine Textdarstellung von Objekten und Arrays. Beim nächsten Laden wird der Text wieder in Daten umgewandelt und geprüft. Version 2 ergänzt Nonogram und den Snake-Rekord. Falls nur Version 1 vorhanden ist, werden Sudoku, Minesweeper, Sprache, Design und frühere Siege übernommen. Alte Bestzeiten werden verworfen; der alte Eintrag bleibt zur Sicherheit bestehen.

Die Daten sind an Browser und Website-Adresse gebunden. Derselbe Spielstand erscheint nicht automatisch auf einem anderen Gerät. Private Fenster löschen diese Daten normalerweise beim Schließen. Falls der Browser Speichern blockiert, zeigt Mini Arcade eine Warnung, lässt die laufende Partie aber zu.

Die Zeit wird als Anzahl gespielter Sekunden gespeichert. Ein Timer erhöht diesen Wert nur, solange die Spielseite sichtbar und die Partie aktiv ist. Dadurch zählt eine Stunde in einem anderen Tab nicht als Spielzeit.

## 6. Sprache, Design und Zugänglichkeit

`src/i18n.ts` enthält für jeden Textschlüssel Deutsch und Englisch. `t('newGame')` liefert etwa „Neues Spiel“ oder „New game“. Beim Sprachwechsel wird auch `document.documentElement.lang` aktualisiert. Das hilft Vorleseprogrammen bei der Aussprache.

Das Design nutzt Tailwind-Klassen für übliche Abstände und Layouts. Wiederkehrende Spielbrett-Regeln und Farbvariablen stehen in `src/index.css`. Die Systemoption folgt dem Hell-/Dunkelmodus des Betriebssystems. `prefers-reduced-motion` verkürzt Animationen für Menschen, die weniger Bewegung wünschen.

Die Bretter besitzen beschriftete Felder und Tastaturbefehle. Das Profi-Feld passt sich der verfügbaren Breite an, sodass alle 30 Spalten gleichzeitig sichtbar sind. Auf schmalen Smartphones werden die Felder dadurch sehr klein; Querformat oder ein größerer Bildschirm machen längere Profi-Partien leichter bedienbar.

Bei Nonogram ist auch das 15×15-Raster zunächst ganz sichtbar. Die freiwillige Vergrößerung lässt größere Felder innerhalb des Spielbereichs verschieben, ohne die gesamte Seite horizontal zu scrollen. Snake lässt sich mit Tastatur, Wischgeste oder sichtbaren Pfeilknöpfen steuern. Ein Tabwechsel pausiert eine offene Runde.

## 7. Welche Tests gibt es?

`npm.cmd test` startet Vitest. Diese Tests führen die Spielregeln direkt aus und sind schnell. Sie prüfen unter anderem Sudoku-Erzeugung, sichere Minesweeper-Züge, alle 18 Nonogram-Motive, erzeugte Rätsel sowie Bewegung, Tempo und Kollisionen bei Snake.

`npm.cmd run test:e2e` startet Playwright. Es öffnet die echte Seite in einem Chromium-Testbrowser, einmal in Desktop- und einmal in Mobilgröße. Diese Tests prüfen Navigation, Sprache, gespeicherten Zustand, Nonogram-Eingaben und Zoom, Snake-Start und Pause sowie die bisherigen Spielfunktionen. Vor dem ersten Lauf muss mit `npm.cmd exec playwright install chromium` der Testbrowser installiert werden.

`npm.cmd run build` ist eine weitere Prüfung: TypeScript lehnt unpassende Typen ab, danach erzeugt Vite die Produktionsdateien. `npm.cmd run lint` sucht verdächtige Codemuster.

**Übung:** Ändere in einem Test vorübergehend eine Erwartung von `toBe('won')` zu `toBe('lost')`. Führe `npm.cmd test` aus und lies, was der Fehlerbericht über erwarteten und tatsächlichen Wert sagt. Verwirf die Änderung danach.

## 8. Ein weiteres Spiel ergänzen

Für ein weiteres Spiel beschreibst du zuerst seinen Zustand und seine Regeln in einer neuen Datei unter `src/games/`. Danach ergänzt du die Speicherung in `store.ts`, die sichtbare Spielseite und eine Route in `App.tsx`, die Texte in `i18n.ts` sowie Tests für wichtige Regeln und Bedienwege. Beginne mit einem kleinsten spielbaren Durchgang. Zusätzliche Statistiken und Feinschliff folgen, sobald die Grundregeln stimmen.
