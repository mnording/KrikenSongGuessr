---
version: 1
slug: "src-pages-play-tsx"
primary_target: "src/pages/Play.tsx"
related_targets: ["src/components/Timeline.tsx"]
---

# Player screens (/play/:code)

Scope: the team's phone during a game — lobby, in-game (placing, watching, reveal), finished. Mode: Operate. Host screens and Join keep the incumbent look for now.

Audience: Kriken crew teams in a loud, dim living room on game night; read in one-second glances. Job: know whose turn it is, place the song, follow the other teams' race. Constraints: flow, controls and copy unchanged (user: "changes to how it plays" would feel wrong); avoid generic app look.

## Direction contract

THESIS: Every song is a festival ticket stub dated by its year; every team wears a woven wristband. Refuses the dark-slate app with green accent and a sideways tab row.

OWN-WORLD: Night-field indigo ground (#17122e), cool thermal-white ticket stock with notched perforation edges and ink-indigo print, team colours as woven wristband fabric with a white snap, one acid-lime (#d7ff3d) reserved for what can be pressed. Big Shoulders Display for years and banners, Archivo for text.

STORY: The team sees at a glance whose wristband owns the screen, every team's count, and their own stub strip; they tap a perforation, the strip opens, they lock.

FIRST VIEWPORT: Full-bleed wristband at top (team colour, "Er tur!" ~4rem or "<Lag> spelar" ~2.6rem); 3-column whole-cell grid of all team wristbands with counts below; one hint line; stub timeline; lime LÅS docked at the bottom.

FORM: Festivalbiljetten, candidate 5 of 7 (assigned by the roll), seed:6463e24745a33eca. Raises: whole-cell grid from the doujin catalog (all teams visible, no sideways scroll); one headline element per stub (the year) from the Saville catalog; just-won stub stays lit until next turn from the gate board; every stub the same height and scale from the botanical folio; action colour only on pressable things from the warm consumer app. Signature: perforations are the slots; choosing one tears the strip open into a lime "?" stub.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
