# Was noch zu tun ist

Stand: 10.09.2026 · 66 Figuren · 26 Verbindungen · Seite läuft unter
https://nikwar-schu.github.io/stammbaum-der-goetter/

Die Liste ist nach Dringlichkeit geordnet, nicht nach Aufwand. Der Abschnitt
„Bevor du sie herumzeigst" ist der einzige, der zeitkritisch ist — alles andere
kann wachsen, solange du magst.

---

## 1. Bevor du sie herumzeigst

Die Seite ist technisch öffentlich, aber noch nicht vorzeigefertig. Diese Punkte
sind klein, sollten aber erledigt sein, bevor du den Link breiter streust.

### Rechtliches

- [ ] **Impressum anlegen.** In Deutschland brauchen Telemedien in der Regel eine
      Anbieterkennzeichnung (§ 5 DDG). Bei rein privaten, nicht geschäftsmäßigen
      Seiten ist die Rechtslage nicht eindeutig; die verbreitete Empfehlung
      lautet, trotzdem eines anzulegen. Ich bin kein Jurist — wenn du die Seite
      wirklich breit teilen willst, kläre das kurz ab oder nimm eine der
      gängigen Vorlagen.
- [ ] **Datenschutzhinweis.** GitHub Pages protokolliert beim Aufruf die
      IP-Adresse der Besucher; darüber ist zu informieren. Die Seite selbst setzt
      keine Cookies, lädt keine fremden Schriften und bindet nichts von Dritten
      ein — der Hinweis bleibt also kurz.
- [ ] **Lizenz festlegen.** Bisher gibt es keine. Ohne Lizenz darf streng
      genommen niemand etwas mit dem Code anfangen. Üblich und passend wäre:
      MIT für den Code, CC BY 4.0 für die Texte. Sag Bescheid, dann lege ich
      `LICENSE` an und schreibe es ins README.

### Auffindbarkeit und erster Eindruck

- [ ] **Favicon.** Fehlt komplett — im Browser-Tab steht ein leeres Blatt.
- [ ] **Vorschaubild für geteilte Links** (`og:image`, `twitter:card`). Wer den
      Link in WhatsApp, Discord oder Mastodon teilt, sieht derzeit nur den nackten
      Text. Ein Ausschnitt des Stammbaums als Bild wäre naheliegend.
- [ ] **Beschreibung und Titel je Sprache.** `index.html` ist fest auf Deutsch;
      englische Besucher sehen im Suchergebnis deutschen Text.
- [ ] **Suchmaschinen sehen fast nichts.** Die Seite baut sich erst im Browser
      auf; ohne JavaScript bleibt sie leer. Die Textansicht (`#/text`) ist der
      richtige Ansatz, wird aber ebenfalls erst im Browser erzeugt. Wenn dir
      Auffindbarkeit wichtig ist: eine statische HTML-Fassung der Textansicht
      beim Bauen miterzeugen.

---

## 2. Inhalt — die eigentliche Arbeit

66 von angestrebten 400 bis 600 Figuren. Das ist der Löwenanteil des Projekts;
die Anwendung ändert sich dabei nicht mehr.

### Etappe auf ~150 (nächster Schritt)

- [ ] **Kinder der Nyx** — Thanatos, Hypnos, die Moiren, Nemesis, Eris, Geras,
      Oizys, Momos, Apate, Philotes, Keres, Moros, die Hesperiden
- [ ] **Kinder der Eris** — Ponos, Lethe, Limos, Ate, Dysnomia, Horkos und die
      übrigen; Musterfall für Nischengottheiten, die kaum jemand kennt
- [ ] **Hekate** samt Eltern (Perses und Asteria stehen schon bereit)
- [ ] **Nike, Kratos, Bia, Zelos** — Kinder von Pallas und Styx, ebenfalls
      vorbereitet
- [ ] **Musen** (9), **Chariten** (3), **Horen** (beide Gruppen) — die Mütter
      Mnemosyne und Themis sind da
- [ ] **Anemoi** (Boreas, Notos, Euros, Zephyros) und **Astra Planeta** — Eltern
      Astraios und Eos stehen
- [ ] **Iris und die Harpyien** — dafür fehlt noch die Okeanide Elektra
- [ ] **Hermes** (mit Maia und den Plejaden), **Dionysos** (mit Semele), **Pan**
- [ ] **Asklepios-Familie** — Hygieia, Panakeia, Iaso, Aigle
- [ ] **Weitere Okeaniden und Nereiden** — Doris, Eurynome, Pleione, Amphitrite,
      Thetis, Galateia
- [ ] **Römische Eigengottheiten** — Ianus, Terminus, Quirinus, Bellona, Flora,
      Pomona, Vertumnus, Fortuna, Faunus, Silvanus, Consus, Laren, Penaten,
      Carmenta. Bisher hat der römische Modus **kein** einziges Eigengewächs;
      das ist die auffälligste Lücke.

### Etappe auf ~400

- [ ] Nereiden vollständig, Okeaniden in Auswahl, Flussgötter
- [ ] Nymphengruppen — Dryaden, Najaden, Oreaden, Meliai, Hamadryaden
- [ ] Seltene römische Kultgottheiten — Robigus, Cardea, Furrina, Vediovis,
      Summanus, Angerona, Anna Perenna, Bona Dea, Portunus, Feronia
- [ ] Personifikationen — Tyche, Nemesis, Hebe (da), Peitho, Harmonia, Hedone,
      Sophrosyne, Eleos

### Später

- [ ] **Helden-Ebene** (M4) — Herakles, Perseus, Theseus, Iason, Achilles,
      Odysseus, Aeneas, Romulus und Remus. Datenmodell und Filterleiste sind
      vorbereitet, die Sachgruppe ist leer.
- [ ] **Bilder** — gemeinfreie Aufnahmen von Wikimedia Commons. Die Felder
      (`image` mit Urheber und Lizenz) stehen im Schema. Rechne mit spürbarem
      Aufwand je Figur, weil die Lizenz jedes Bildes einzeln zu prüfen ist.

---

## 3. Datenqualität

Das Prüfskript findet Strukturfehler, **keine inhaltlichen**. Diese Punkte
schließen die Lücke.

- [ ] **Nach jeder Etappe `npm run check:refs`** — prüft, ob die verlinkten
      Wikipedia-Artikel erreichbar sind. Bei den ersten 66 Figuren zeigten fünf
      von 125 Verweisen ins Leere; sie sind korrigiert.
- [ ] **Nach jeder Etappe `npm run check:links`** — zeigt, welche im Text
      genannten Gottheiten noch keinen Verweis bekommen, weil sie fehlen oder
      anders geschrieben sind.
- [ ] **Stichproben gegen Wikidata.** Für die entlegenen Figuren die Eltern und
      Namen einmal abgleichen. Wikidata ist gemeinfrei (CC0) und maschinenlesbar;
      genau dort bin ich am ehesten ungenau.
- [ ] **Textstellen prüfen.** Jede Abstammung trägt Werk und Vers. Bei den mit
      `obscure` gekennzeichneten Figuren lohnt eine Stichprobe — dort beruht der
      Eintrag oft auf einer einzigen Zeile.
- [ ] **Verbindungen ergänzen.** Bisher 26. Bei jeder neuen Etappe kommen Ehen
      und Liebschaften dazu; das Prüfskript meldet Paare mit gemeinsamen Kindern,
      deren Art noch fehlt.

---

## 4. Technik

Nichts davon ist dringend; die Seite läuft.

- [ ] **Lesbarkeit bei 400+ Figuren.** Der Baum ist heute 3907 × 1325 Pixel bei
      66 Figuren. Bei 400 wird die breiteste Ebene weit über 10 000 Pixel
      erreichen. Wenn es kippt, ist der nächste Hebel, breite Ebenen umbrechen
      zu lassen (`elk.layered.wrapping.strategy`).
- [ ] **Ladegröße.** 230 kB gzip, davon 136 kB Cytoscape. Ließe sich nachladen,
      sobald jemand den Baum wirklich ansieht — lohnt erst, wenn die Datenmenge
      wächst.
- [ ] **Tastaturbedienung im Baum.** Die Zeichenfläche ist nicht mit der Tastatur
      erreichbar. Die Textansicht fängt das teilweise auf, aber nicht ganz.
- [ ] **Die Textansicht ausbauen** — derzeit nur die Leitversion als
      verschachtelte Liste, ohne Beschreibungen und ohne Verbindungen.

Erledigt und geprüft: Dunkelmodus, Handy-Ansicht, Deep-Links, Brückenkanten beim
Sichtwechsel, zweisprachige Namen.

---

## 5. Ideen, kein Muss

- [ ] **Verwandtschaftsrechner** — „wie ist Achilles mit Zeus verwandt?" Der
      Graph kann das bereits, es fehlt nur die Bedienung.
- [ ] **Nebeneinander-Ansicht** griechisch und römisch statt Umschalter
- [ ] **Ausschnitt als Bild oder PDF ausgeben** — für Referate und zum Ausdrucken
- [ ] **Zeitleiste der Quellen** — welcher Autor überliefert was, und wann
- [ ] **Eigene Adresse** statt der GitHub-Adresse
