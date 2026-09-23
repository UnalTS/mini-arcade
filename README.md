# Mini Arcade

Eine kleine, zweisprachige Spielesammlung mit Sudoku, Minesweeper, Nonogram und Snake. Sie läuft vollständig im Browser: Sie braucht weder Konto noch Server und speichert Partien und Siege lokal.

## Starten unter Windows

Voraussetzung: Node.js 20.19+ oder 22.12+. Im Projektordner in PowerShell:

```powershell
cd C:\Users\unala\Desktop\developing\mini-arcade
npm.cmd install
npm.cmd run dev
```

Die angezeigte Adresse (gewöhnlich `http://localhost:5173`) im Browser öffnen. `npm.cmd` wird bewusst verwendet, weil auf diesem Rechner PowerShell die Datei `npm.ps1` blockiert. Eine Änderung der Ausführungsrichtlinie ist dafür nicht erforderlich.

Weitere Befehle:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd exec playwright install chromium
npm.cmd run test:e2e
```

Der Produktions-Build landet in `dist/`. Eine PWA und Offline-Start sind nicht eingerichtet.

## Veröffentlichung mit GitHub Pages

Dieses Projekt ist für ein eigenes GitHub-Repository vorbereitet. Der Workflow in `.github/workflows/deploy-pages.yml` prüft und baut die Website bei jedem Push auf `main` und veröffentlicht den Inhalt von `dist/` über GitHub Pages. Im Repository unter **Settings → Pages → Build and deployment → Source** muss **GitHub Actions** ausgewählt sein. Danach steht die Website typischerweise unter `https://<benutzername>.github.io/<repository-name>/`.

Beim Pages-Build setzt der Workflow `GITHUB_PAGES_BASE` auf `/<repository-name>/`. Das sorgt dafür, dass CSS und JavaScript im richtigen Unterordner geladen werden. Für die Spielseiten nutzt die veröffentlichte Version Hash-URLs wie `/#/sudoku`, weil GitHub Pages beim direkten Neuladen einer normalen `/sudoku`-Adresse keine React-Seite ausliefern kann. Lokal bleiben die gewohnten Adressen `/sudoku` und `/minesweeper` erhalten. Die lokalen Spielstände werden **nicht** zur Online-Seite übertragen: Der Browser speichert Daten für jede Website-Adresse getrennt.

## Was die App kann

- Sudoku: 9×9, drei Schwierigkeitsgrade, lokal erzeugte Rätsel mit eindeutiger Lösung, Notizen, Rückgängig, Pause und Hinweise. Drei falsche Eingaben beenden das Spiel. Siege werden pro Schwierigkeit gezählt, auch wenn ein Hinweis genutzt wurde.
- Minesweeper: 9×9/10, 16×16/40 und 30×16/99. Der erste Aufdeckzug samt Nachbarn ist sicher. Flaggen funktionieren per Rechtsklick, Tastatur oder sichtbarem Touch-Schalter. Erneutes Aktivieren eines Zahlenfelds deckt Nachbarn auf, wenn die Zahl der Flaggen passt.
- Nonogram: 5×5, 10×10 und 15×15. Die Zahlen zeigen Gruppen gefüllter Felder je Zeile und Spalte. Sechs handgestaltete Motive pro Größe erscheinen der Reihe nach; danach folgen automatisch erzeugte, logisch lösbare Rätsel. Füllen und X setzen funktioniert per Moduswahl, Tastatur und Rechtsklick. Drei falsche Markierungen beenden den Versuch; ein Hinweis und Rückgängig helfen beim Lösen.
- Snake: 20×20 Felder, Äpfel, Wand- und Selbstkollision. Die Schlange wird alle vier Äpfel schneller und die Punkte pro Apfel steigen mit dem Tempo. Pfeiltasten, WASD, Wischen und Bildschirmtasten steuern sie. Tabwechsel pausiert; nach Neuladen bleibt nur der Rekord.
- Deutsch und Englisch, helles und dunkles Design sowie eine Systemoption. Die Auswahl und je ein angefangener Spielstand pro Spiel bleiben im Browser erhalten.
- Die Startseite zeigt keine Ergebnisse. Auf den Spielseiten stehen die Siege pro Schwierigkeitsgrad beziehungsweise Feldgröße; Snake zeigt dort seinen Punkterekord. Bestzeiten werden nicht gespeichert.
- Tastatursteuerung: Pfeile bewegen den Fokus im Brett. In Sudoku geben 1–9 Zahlen ein und Entf/Backspace löscht. In Minesweeper aktiviert Enter/Leertaste den gewählten Modus und `F` setzt oder entfernt eine Flagge.

## Mini-Tutorial: Wie das Projekt aufgebaut ist

Eine ausführlichere, schrittweise Erklärung mit kleinen Übungen steht in [TUTORIAL.md](TUTORIAL.md).

### 1. Browser, React und TypeScript

`index.html` enthält nur das Grundgerüst. `src/main.tsx` startet React, also die Bibliothek, die aus Komponenten die sichtbare Oberfläche baut. `src/App.tsx` enthält Navigation, Startseite und Spielseiten. Eine Komponente ist eine Funktion, die anhand ihres aktuellen Zustands HTML beschreibt. Wenn sich dieser Zustand ändert, aktualisiert React die passenden Teile der Oberfläche.

TypeScript ergänzt JavaScript um Typen. Ein Typ wie `SudokuGame` beschreibt genau, welche Daten eine Partie enthält. Dadurch weist der Editor auf viele Fehler hin, bevor die Website überhaupt gestartet wird. Vite liefert während der Entwicklung schnelle Aktualisierungen und erzeugt mit `npm.cmd run build` die fertigen Browserdateien. Tailwind CSS stellt kurze Klassen für Abstände und Layout bereit; wiederkehrende Farben und Spielfeldstile stehen in `src/index.css`.

### 2. Spielregeln getrennt von der Oberfläche

Die Dateien unter `src/games/` enthalten die Regeln als Funktionen. Beispiel: `revealMine(game, index)` erhält einen Spielzustand und liefert den nächsten. Die Funktion weiß nichts über Knöpfe, Farben oder React. Dadurch lässt sich dieselbe Regel mit kleinen Eingaben automatisch prüfen.

Sudoku baut zunächst ein vollständiges gültiges Brett, entfernt Zahlen unter Wahrung genau einer Lösung und stuft das Ergebnis anhand eines regelbasierten Lösers ein. „Einfach“ ist mit wenigen direkten oder versteckten Einzelkandidaten lösbar. „Mittel“ benötigt mehr versteckte Einzelkandidaten oder zusätzliche Kandidatenausschlüsse wie gesperrte Kandidaten und Paare. „Schwer“ benötigt darüber hinaus weitere Schlussfolgerungen. Die Erzeugung läuft in `sudoku.worker.ts` in einem Web Worker, also einem getrennten Browser-Thread, damit die Oberfläche ansprechbar bleibt. Falls die Erzeugung nicht gelingt, gibt es geprüfte lokale Ersatzrätsel.

Minesweeper legt die Minen erst beim ersten Aufdecken. So kann dieses Feld samt Nachbarn zuverlässig minenfrei bleiben. Ein Feld mit `nearby === 0` öffnet über eine Warteschlange seine sicheren Nachbarn. Als Sieg zählt das Aufdecken aller Felder ohne Mine; Flaggen sind eine Hilfe, aber keine Siegpflicht.

Nonogram erzeugt die Randzahlen aus dem fertigen Bild. Der Solver prüft, welche Felder in allen noch möglichen Zeilen- und Spaltenmustern übereinstimmen. Ist auf diese Weise das ganze Raster bestimmbar, braucht das Rätsel kein Raten und besitzt nur eine Lösung. Zufallsrätsel entstehen in einem Web Worker, damit die Seite dabei bedienbar bleibt. Snake besitzt eine reine `stepSnake`-Funktion: Ein Aufruf bewegt die Schlange exakt ein Feld und prüft Apfel, Wand und eigenen Körper. Die Oberfläche ruft sie in einem festgelegten Takt auf.

### 3. Zustand, Speicherung und Sprache

`src/store.ts` beschreibt die gespeicherten Daten. `localStorage` ist ein kleiner Speicher des Browsers für diese Website. Er ist weder Cloud-Speicher noch über Geräte hinweg synchron. Im privaten Browserfenster oder nach dem Löschen von Websitedaten kann er verschwinden. Beim Laden werden Daten geprüft; ungültige Einträge werden verworfen. Daten der ersten Version werden übernommen, ohne den alten Eintrag zu löschen. Wenn Speichern blockiert ist, kann weitergespielt werden, aber nach einem Neuladen ist der Fortschritt möglicherweise weg.

`src/i18n.ts` hält die deutschen und englischen Texte. Die Funktion `t('newGame')` liefert den Text in der gewählten Sprache. Auch das HTML-Attribut `lang` wird umgestellt, damit Hilfstechnologien die richtige Sprache erkennen. Farben folgen standardmäßig dem Betriebssystem; eine eigene Auswahl überschreibt das.

### 4. Testen und erweitern

Vitest prüft die reinen Spielfunktionen: eindeutige Sudoku-Lösungen, Fehler und Hinweise, sichere Minesweeper-Starts und Flaggen. Playwright öffnet die echte Website in einem Testbrowser und prüft Navigation, Neuladen, Sprachwechsel und Touch-Bedienung. Die Tests ersetzen keine manuelle Prüfung mit Maus, Tastatur und einem echten Smartphone, finden aber viele Wiederholungsfehler zuverlässig.

Für ein neues Spiel bietet sich derselbe Aufbau an: zuerst einen klaren Zustand und Spielfunktionen unter `src/games/`, dann eine Seite in `App.tsx`, Übersetzungen in `i18n.ts` und anschließend Regel- und Browser-Tests. Zusätzliche Spiele können später über eigene URLs ergänzt werden.
