# Stammbaum der Götter

Ein interaktiver Stammbaum der griechischen und römischen Gottheiten — von Chaos und
Gaia bis zu den kleinsten Nischengottheiten, mit Quellenangaben zu jeder Abstammung.

- **Umschalter griechisch / römisch.** Namen und Texte wechseln, die Positionen im
  Baum bleiben unverändert. Figuren ohne Gegenstück verschwinden; ihre Abstammung
  wird durch gestrichelte Brückenlinien überbrückt, damit der Baum zusammenhängend
  bleibt.
- **Zweisprachig** deutsch und englisch.
- **Widersprüchliche Überlieferungen** sind sichtbar gemacht: Hesiods Fassung gilt als
  Leitversion, abweichende Angaben lassen sich als gestrichelte Linien zuschalten —
  bei Aphrodite etwa die homerische Abstammung von Zeus und Dione.
- **Unscharfe Suche** über Namen, Beinamen, Zuständigkeiten und Attribute in beiden
  Sprachen und beiden Sichten. „Blitz" und „thunderbolt" führen beide zu Zeus.
- **Fokusansicht** statt Gesamtbild: der Baum beginnt oben und öffnet sich schrittweise.

## Loslegen

```bash
npm install
npm run dev
```

Die Anwendung läuft dann unter der Adresse, die Vite ausgibt.

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm run dev` | Daten prüfen, aufbereiten, layouten und Entwicklungsserver starten |
| `npm run validate` | Nur die Datenprüfung |
| `npm test` | Tests für Graphlogik und Datenintegrität |
| `npm run build` | Vollständiger Bau nach `dist/` |
| `npm run gen:schema` | JSON-Schema für den Editor aus dem Zod-Schema erzeugen |

## Eine Gottheit hinzufügen

Alle Inhalte stehen als YAML unter `data/figures/`, eine Datei je Sachgruppe. Jede
Datei verweist in ihrer ersten Zeile auf das passende JSON-Schema — Editoren mit
YAML-Unterstützung zeigen damit Autovervollständigung an und markieren Tippfehler
sofort.

Ein Eintrag im Kleinstformat:

```yaml
  - id: nike
    category: personification
    tier: 5
    confidence: attested
    parentage:
      - id: hesiod
        parents: [pallas-titan, styx]
        mode: sexual
        canonical: true
        confidence: attested
        sources:
          - { source: hesiod-theogonie, loc: '383-385' }
    greek:
      name: Nike
      nameOriginal: Νίκη
      domains: [victory]
      description:
        de: Die Siegesgöttin, die Zeus im Titanenkrieg zur Seite stand.
        en: The goddess of victory, who stood by Zeus in the war of the Titans.
    roman:
      name: Victoria
      domains: [victory]
      description:
        de: In Rom Schutzgöttin des siegreichen Feldherrn, mit eigenem Altar in der Kurie.
        en: In Rome the protectress of the victorious general, with her own altar in the Curia.
```

Danach `npm run validate` ausführen. Das Skript prüft unter anderem:

- Verweise ins Leere (Eltern, Partner, Gegenstücke, Quellenschlüssel)
- Kreise in der Abstammung — jemand als eigener Vorfahre
- Generationslogik: ein Kind muss unter beiden Eltern stehen
- fehlende Übersetzungen und unbekannte Zuständigkeiten
- doppelt vergebene Kennungen

Es findet **Strukturfehler, keine inhaltlichen**. Wer eine Gottheit falsch einordnet,
merkt das hier nicht — dafür trägt jede Abstammung ihre antike Textstelle.

### Grundbegriffe des Datenmodells

- **Eine Figur, zwei Ausprägungen.** Aphrodite und Venus sind ein Knoten mit einem
  `greek`- und einem `roman`-Teil. Ianus hat nur einen römischen, Hekate nur einen
  griechischen. Genau deshalb können die Positionen nicht von der gewählten Sicht
  abhängen.
- **`canonical`** kennzeichnet die Leitversion einer Abstammung. Nur sie bestimmt das
  Layout; alle weiteren Fassungen werden als Variantenlinien gezeichnet.
- **`tier`** ist die Generationsebene und muss der Leitversion folgen. Dass Atlas und
  Prometheus eine Reihe tiefer sitzen als Zeus, ist kein Fehler: ihre Mutter Klymene
  ist eine Okeanide und damit selbst schon Titanenkind.
- **`confidence`** hält fest, wie gut eine Figur belegt ist — wichtig bei den
  Nischengottheiten, die oft nur eine einzige Textstelle nennt.
- **Verbindungsknoten** zwischen Eltern und Kindern werden abgeleitet, nicht gepflegt.

## Aufbau

```
data/            die Inhalte in YAML - das eigentliche Produkt
schema/          aus dem Zod-Schema erzeugt, für die Editor-Unterstützung
scripts/         Prüfung, Aufbereitung, Layoutberechnung
src/schema/      Zod-Schema und Typen; eine Quelle der Wahrheit
src/graph/       Graphlogik und Zeichenfläche
src/ui/          Oberfläche
```

Das Layout wird **beim Bauen** mit ELK berechnet und als feste Koordinaten abgelegt.
Das ist die Voraussetzung dafür, dass beim Umschalten zwischen den Sichten nichts
verrutscht: Schalter regeln ausschließlich Sichtbarkeit, nie Positionen. Die erzeugten
Dateien unter `public/data/` sind bewusst nicht eingecheckt — eine einzelne neue Figur
sortiert das Bild um.

## Quellen

Die Beschreibungstexte sind eigens verfasst. Es wurden keine Texte aus Nachschlagewerken
übernommen; zitiert werden die antiken Werke nach Buch und Vers, verlinkt wird auf
Wikipedia und Theoi. Das Verzeichnis der zitierten Werke steht in `data/sources.yaml`.
