# Mein Karteikasten — Designvariante 2

Diese Projektkopie zeigt eine zweite, hellere und klarere Gestaltung der Vokabel-App. Die bestehende warme Papieroptik wird durch einen sehr hellen, leicht grünlichen Hintergrund, weiße Flächen, dezente grüne Akzente, mehr Weißraum und klarere Bedienflächen ersetzt.

**Funktionen:** Die App-Funktionen wurden aus der bestehenden Version übernommen; diese Variante ist vor allem eine alternative Gestaltung.

## Vorschau / Veröffentlichung

Diese Variante ist eine separate Projektkopie und noch nicht unter einer eigenen URL veröffentlicht. Die bisherige Live-Version bleibt unter [https://antoniotroiano.github.io/karteikasten/](https://antoniotroiano.github.io/karteikasten/) erreichbar, solange du diese Variante nicht in das veröffentlichte Repository übernimmst.

## Technischer Aufbau

- `index.html` — HTML-Struktur und Einbindung der Dateien
- `css/styles.css` — Styling für Designvariante 2
- `js/core.js` — Konfiguration, Speicherung und Tagesfortschritt
- `js/cards.js` — Erfassen, Bearbeiten, Duplikatprüfung und Listenimport
- `js/learning.js` — Leitner-System und Lernrunden
- `js/overview.js` — Fortschrittsübersicht und Zurücksetzen
- `js/backup.js` — JSON-Export und -Import
- `js/ui.js` — Navigation zwischen den Tabs
- `js/app.js` — Initialisierung der App

## Lokal ausführen

1. ZIP-Datei entpacken.
2. `index.html` in einem aktuellen Browser öffnen oder das Projekt über einen lokalen Webserver starten.
3. Für GitHub Pages den Inhalt des Projektordners ins Repository übertragen und veröffentlichen.

## Wichtig zu gespeicherten Daten

Die Variante verwendet absichtlich denselben `localStorage`-Schlüssel wie die bisherige App (`vocab-cards`). Wenn sie unter derselben Website-Origin ausgeführt wird, nutzt sie daher denselben Kartenbestand. Ein Backup über **Import / Export** ist vor dem Austausch trotzdem empfehlenswert.
