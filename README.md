# Stammbaum der Götter

Ein interaktiver Stammbaum der griechischen und römischen Gottheiten — von Chaos und
Gaia bis zu den kleinsten Nischengottheiten, mit Quellenangaben zu jeder Abstammung.

- **Umschalter griechisch / römisch.** Namen und Texte wechseln, die Positionen im
  Baum bleiben unverändert. Figuren ohne Gegenstück verschwinden; ihre Abstammung
  wird durch gestrichelte Brückenlinien überbrückt, damit der Baum zusammenhängend
  bleibt.
- **Zweisprachig** deutsch und englisch.
- **Ehen und Liebschaften** sind unterschieden und mit Quelle belegt. Aphrodite ist mit
  Hephaistos verheiratet (⚭) und Ares zugetan (♥) - beides steht nebeneinander im
  Infofenster und wird im Baum als Linie mit dem passenden Zeichen gezeichnet.
- **Klick auf eine Gottheit** blendet alles zurück außer ihr selbst und dem, was
  unmittelbar mit ihr verbunden ist: Eltern, Kinder und Partner.
- **Widersprüchliche Überlieferungen** sind sichtbar gemacht: Hesiods Fassung gilt als
  Leitversion, abweichende Angaben lassen sich als gestrichelte Linien zuschalten —
  bei Aphrodite etwa die homerische Abstammung von Zeus und Dione.
- **Unscharfe Suche** über Namen, Beinamen, Zuständigkeiten und Attribute in beiden
  Sprachen und beiden Sichten. „Blitz" und „thunderbolt" führen beide zu Zeus.
- **Generationentiefe regelbar**: Der Baum startet vollständig; wer nur die ersten
  Generationen sehen will, schränkt die Tiefe in der Filterleiste ein.

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

Beim Start sind alle Sachgruppen eingeschaltet und alle Generationen sichtbar; über die
Filterleiste lässt sich beides einschränken.

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

## Eine Verbindung eintragen

Wer mit wem, steht in `data/relationships.yaml` - bewusst in einer eigenen Datei, denn
eine Beziehung ist wechselseitig und gehört nicht an eine der beiden Figuren:

```yaml
  - between: [aphrodite, ares]
    type: liaison
    sources:
      - { source: homer-odyssee, loc: '8.266-366' }
    note:
      de: Helios verrät die beiden an Hephaistos, der ein unsichtbares Netz schmiedet.
      en: Helios betrays the two to Hephaestus, who forges an invisible net.
```

Mögliche Arten: `marriage` (Ehe), `consort` (feste Verbindung ohne überlieferte
Eheschließung), `liaison` (Liebschaft), `abduction` (Verbindung, die als Raub beginnt)
und `unknown`. Paare mit gemeinsamen Kindern, für die noch kein Eintrag besteht, meldet
das Prüfskript als Hinweis - aus der Abstammung allein geht nicht hervor, ob geheiratet
wurde.

Danach `npm run validate` ausführen. Das Skript prüft unter anderem:

- Verweise ins Leere (Eltern, Partner, Gegenstücke, Quellenschlüssel)
- Kreise in der Abstammung — jemand als eigener Vorfahre
- Generationslogik: ein Kind muss unter beiden Eltern stehen
- fehlende Übersetzungen und unbekannte Zuständigkeiten
- doppelt vergebene Kennungen
- Verbindungen: unbekannte Figuren, doppelte Paare, Selbstbezug

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
- **Partnerlinien fließen nicht in das Layout ein.** Partner können im Baum weit
  auseinanderliegen; Linien quer über hunderte Figuren wären unlesbar. Gezeichnet werden
  sie nur für die gerade gewählte Figur.

## Aufbau

```
data/            die Inhalte in YAML - das eigentliche Produkt
                 figures/ die Gottheiten, relationships.yaml wer mit wem
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
