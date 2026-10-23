# Mein Karteikasten

Eine einfache, browserbasierte Lern-App für Vokabeln und Fachbegriffe. Sie verwendet das **Leitner-Karteikastensystem** mit fünf Lernboxen, damit Begriffe in passenden Abständen wiederholt werden.

**App öffnen:** https://antoniotroiano.github.io/karteikasten/

## Funktionen

- **Karteikarten erstellen und bearbeiten:** Begriff, Übersetzung oder Definition sowie eine optionale Zusatzinfo für Beispiele, Kontext oder Eselsbrücken.
- **Vier Kategorien:** Englisch, Spanisch, iSAQB und Sonstiges. Karten können getrennt oder gemischt gelernt werden.
- **Listenimport:** Mehrere Karten über eine strukturierte Textliste erfassen und vor dem Speichern prüfen.
- **Lernmodus:** Karten umdrehen und mit „Nochmal“, „Schwer“, „Gut“ oder „Leicht“ bewerten.
- **Fünf Lernboxen:** Wiederholungsintervalle von 1, 3, 7, 14 und 30 Tagen.
- **Begrenzte Lerneinheiten:** Bis zu sechs unterschiedliche Karten pro Runde. Karten mit „Nochmal“ werden höchstens zweimal zusätzlich in derselben Runde gezeigt.
- **Tagesziel:** Das reguläre Tagesziel liegt bei acht verschiedenen Karten. Weitere freiwillige Lernrunden sind möglich.
- **Übersicht und Glossar:** Lernstand nach Boxen einsehen und die Funktionsweise des Systems nachlesen.
- **Import und Export:** Vokabeln und Lernfortschritt als JSON-Backup sichern und auf ein anderes Gerät übertragen.

## So funktioniert das Leitner-System

Jede Karte befindet sich in einer von fünf Boxen. Je besser eine Karte sitzt, desto länger wird der Abstand bis zur nächsten Wiederholung.

| Box | Geplantes Wiederholungsintervall |
| --- | --- |
| 1 | 1 Tag |
| 2 | 3 Tage |
| 3 | 7 Tage |
| 4 | 14 Tage |
| 5 | 30 Tage |

- **Nochmal:** Die Karte kommt zurück in Box 1 und bleibt fällig. Sie wird höchstens zweimal zusätzlich in derselben Runde gezeigt.
- **Schwer:** Die Karte bleibt in ihrer Box; das nächste Wiederholungsintervall wird verkürzt.
- **Gut:** Die Karte steigt um eine Box auf.
- **Leicht:** Die Karte steigt um bis zu zwei Boxen auf.

## Mehrere Karten auf einmal erfassen

Im Tab **Erfassen** kann eine Textliste eingefügt werden. Jede Zeile enthält einen Begriff, eine Definition oder Übersetzung und optional eine Zusatzinfo. Die Felder werden mit senkrechten Strichen (`|`) getrennt:

```text
Begriff | Definition / Übersetzung | Zusatzinfo (optional)
throughput | Durchsatz | The system has high throughput.
hola | hallo | ¡Hola! ist eine informelle Begrüßung.
```

Wähle eine Kategorie für die Liste aus und klicke auf **Liste prüfen**. Vor dem Speichern lassen sich Einträge kontrollieren, bearbeiten oder abwählen.

## Zwischen Desktop und Handy wechseln

Die App speichert Daten im lokalen Speicher (`localStorage`) des jeweiligen Browsers. Es gibt keine automatische Synchronisierung zwischen Geräten.

1. Öffne auf dem bisherigen Gerät den Menüpunkt **Import / Export**.
2. Lade ein JSON-Backup herunter.
3. Übertrage die Datei auf das andere Gerät, zum Beispiel über einen persönlichen Cloud-Speicher.
4. Öffne dort die App, wähle das Backup im Bereich **Import / Export** aus und importiere es.

**Achtung:** Der Import ersetzt die vorhandenen Karten und den gespeicherten Tagesfortschritt auf dem Zielgerät. Exportiere zuerst ein Backup des Zielgeräts, falls du dessen Daten behalten möchtest. Der gespeicherte Tagesfortschritt wird aus einem Backup nur übernommen, wenn es zum aktuellen lokalen Datum gehört.

## Daten und Datenschutz

- Die Karten und Lernstände werden lokal im Browser gespeichert.
- Es gibt keine serverseitige Datenbank und keinen automatischen Geräteabgleich.
- Browserdaten können beim Löschen der Website-Daten verloren gehen. Erstelle deshalb regelmäßig ein Backup.
- Die Oberfläche lädt Schriftarten von Google Fonts, sofern eine Internetverbindung besteht; andernfalls greifen die CSS-Fallback-Schriftarten.

## Technischer Aufbau

Die App ist als einzelne HTML-Datei mit CSS und JavaScript umgesetzt und kann über GitHub Pages veröffentlicht werden. Für die Kernfunktionen wird kein Backend benötigt.

- `index.html` – Anwendung
- `README.md` – Projektdokumentation

## Lokal ausführen

1. Repository herunterladen oder klonen.
2. `index.html` in einem aktuellen Browser öffnen.
3. Alternativ die Datei über einen lokalen Webserver oder GitHub Pages bereitstellen.

## Live-Version

[https://antoniotroiano.github.io/karteikasten/](https://antoniotroiano.github.io/karteikasten/)
