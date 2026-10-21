---
name: Kriken Låtgissning
description: The Kriken crew's own song-timeline game; team phones wear festival tickets and wristbands, the host phone keeps a plain dark-slate console.
colors:
  night: "#17122e"
  night-raised: "#221a42"
  night-band: "#2e2556"
  ticket-paper: "#f4f5f8"
  ink: "#17122e"
  ink-soft: "#565072"
  stub-rule: "#c9cbd6"
  perforation: "rgb(241 238 251 / 0.3)"
  night-text: "#f1eefb"
  night-muted: "#b9b3d6"
  theirs-outline: "#9a93bf"
  acid-lime: "#d7ff3d"
  acid-lime-wash: "rgb(215 255 61 / 0.1)"
  miss-coral: "#ff6b5e"
  miss-print: "#b42318"
  host-slate: "#0f172a"
  host-surface: "#1e293b"
  host-surface-raised: "#273449"
  host-border: "#334155"
  host-text: "#f8fafc"
  host-muted: "#94a3b8"
  host-green: "#22c55e"
  host-green-ink: "#052e16"
  host-danger: "#f87171"
  host-correct: "#15803d"
  host-wrong: "#dc2626"
  host-link: "#93c5fd"
  host-focus: "#60a5fa"
typography:
  display:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(3.4rem, 17vw, 4.4rem)"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "normal"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 900
    lineHeight: 0.9
  stub-year:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
  action:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    letterSpacing: "0.06em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    letterSpacing: "0.12em"
  small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
  host-body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  host-headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  tag: "4px"
  stub: "6px"
  dock: "10px"
  count: "14px"
  band: "22px"
  round: "50%"
  host: "14px"
  host-row: "10px"
spacing:
  hair: "4px"
  band-gap: "6px"
  sm: "8px"
  md: "14px"
  gutter: "16px"
  lg: "20px"
components:
  wristband:
    backgroundColor: "{colors.night-band}"
    textColor: "{colors.night-text}"
    typography: "{typography.headline}"
    padding: "28px 72px 18px 20px"
  wristband-mine:
    typography: "{typography.display}"
  team-band:
    typography: "{typography.body-strong}"
    rounded: "{rounded.band}"
    padding: "0 4px 0 10px"
    height: "44px"
  band-count:
    backgroundColor: "{colors.ticket-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.count}"
    height: "28px"
  band-count-winner:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ticket-paper}"
  offline-tag:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ticket-paper}"
    rounded: "{rounded.tag}"
    padding: "1px 6px"
  ticket-stub:
    backgroundColor: "{colors.ticket-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stub}"
    padding: "8px 16px"
    height: "72px"
  ticket-stub-won:
    backgroundColor: "{colors.acid-lime}"
    textColor: "{colors.ink}"
  ticket-stub-open:
    backgroundColor: "{colors.acid-lime-wash}"
    textColor: "{colors.acid-lime}"
    rounded: "{rounded.stub}"
    height: "72px"
  ticket-stub-open-theirs:
    textColor: "{colors.night-muted}"
  lock-button:
    backgroundColor: "{colors.acid-lime}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.dock}"
    height: "64px"
  lock-button-disabled:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.night-muted}"
  verdict-tag:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ticket-paper}"
    rounded: "{rounded.tag}"
    padding: "2px 10px"
  host-button:
    backgroundColor: "{colors.host-surface-raised}"
    textColor: "{colors.host-text}"
    typography: "{typography.host-body}"
    rounded: "{rounded.host}"
    padding: "0 1.1rem"
    height: "48px"
  host-button-primary:
    backgroundColor: "{colors.host-green}"
    textColor: "{colors.host-green-ink}"
  host-input:
    backgroundColor: "{colors.host-slate}"
    textColor: "{colors.host-text}"
    rounded: "{rounded.host}"
    padding: "0 0.9rem"
    height: "48px"
  host-card:
    backgroundColor: "{colors.host-surface}"
    rounded: "{rounded.host}"
    padding: "16px"
---

# Design System: Kriken Låtgissning

## Overview

**Creative North Star: "Festivalbiljetten"**

The game runs in two visual worlds, and which one applies is decided by route. **The team's phone (`/play/:code`) is Festivalbiljetten**: a night-field indigo ground, every song a thermal-white festival ticket stub dated by its year, every team a flat wristband of its own colour, and one acid lime reserved for the thing you press. It is built to be read in a one-second glance across a loud room: whose band owns the top of the screen, every team's count, our own stub strip, the slot we picked. Everything in this world is scoped under the `.fest` wrapper (`src/play.css`), so none of it leaks onto the host.

**The host's phone and the entry screens (`/`, `/host`, `/host/:code`, `/host/songs`, `/join/:code`, and the plain fallback screens inside Play such as "Spelet finns inte längre" and "Spelet är fullt") keep the incumbent dark-slate console** from `src/index.css`: slate surfaces, system-ui type, a single green primary, 14px rounding throughout. It is the original POC look and is documented here as it stands; it has not been redesigned and this file does not propose one. New player-surface work extends Festivalbiljetten; new host work extends the slate console until a deliberate host redesign replaces it.

Festivalbiljetten is flat print, not texture: bands are solid team colour, the snap on the wristband is a plain paper disc (or the team's mascot on a paper pin), tickets are flat paper with notched edges and a dashed tear line. Its drama comes from scale (a condensed 900-weight display face at up to 4.4rem) and from the one lime colour, not from effects.

**Key Characteristics:**
- Two route-scoped worlds: Festivalbiljetten for teams, dark-slate console for the host and entry screens.
- Night indigo ground, thermal-white ticket paper, ink-indigo print.
- Team colour appears only as solid wristband fill, full-bleed or as a pill.
- Every team has a mascot, drawn in the same flat print and always shown on a paper pin.
- Acid lime marks what can be pressed, plus the one stub just won.
- Big Shoulders Display for years, banners and the lock button; Archivo for everything you read.
- Perforations between stubs are the placement slots.

## Colors

Festivalbiljetten is a dark indigo night with paper and ink as the neutrals, team colours as the many voices, and a single acid accent; the host console is cool slate with a single green.

### Primary
- **Acid Lime** (`acid-lime`): the action colour. Fills the docked LÅS button, outlines and tints the open "?" stub (with `acid-lime-wash`), draws the focus ring (3px) and the hover ring on the perforation plus, and is the text-selection colour. It also lights the stub a team just won until the next turn; that is its only non-pressable use.

### Secondary
- **Team colours** (runtime, one per mascot in `src/game/mascots.ts`: red, orange, yellow, green, teal, blue, violet, pink, brown, grey; picking a mascot picks its colour): never tokens in this file, always applied inline as the full fill of a wristband or a team band. Text on them is chosen by the contrast helper (`textOn`), white or near-black, never hand-picked.

### Tertiary
- **Miss Coral** (`miss-coral`): error text on the night ground.
- **Miss Print** (`miss-print`): the year on a revealed stub that was placed wrong; it is the coral's dark cousin because it prints on paper.

### Neutral
- **Night** (`night`): the ground of every player screen and the browser theme colour while the player world is mounted.
- **Night Raised** (`night-raised`): the disabled lock dock and any boxed container (inherited card boxes, e.g. the profile editor).
- **Night Band** (`night-band`): the wristband's fallback fill when no team owns the screen ("Väntar…"), and input borders.
- **Ticket Paper** (`ticket-paper`): stub stock, the wristband snap, mascot pins, the count discs on team bands.
- **Ink** (`ink`): print on paper and lime; also the fill of the small offline and verdict tags. Same value as Night by design: the print is the sky.
- **Ink Soft** (`ink-soft`): artist line on a stub.
- **Stub Rule** (`stub-rule`): the dashed tear line inside a stub between year and text.
- **Perforation** (`perforation`): dashed lines between stubs and the disabled lock's dashed edge.
- **Night Text** (`night-text`) and **Night Muted** (`night-muted`): primary and secondary text on the ground; muted carries hints and the footer.
- **Theirs Outline** (`theirs-outline`): the dashed edge of a slot another team has picked.

### Host console (incumbent)
- **Host Slate / Surface / Surface Raised / Border** (`host-slate`, `host-surface`, `host-surface-raised`, `host-border`): page, rows and cards, default buttons, strokes.
- **Host Green** on **Host Green Ink** (`host-green`, `host-green-ink`): the one primary action per host screen.
- **Host Correct / Wrong** (`host-correct`, `host-wrong`): the reveal result panel fill. **Host Danger** (`host-danger`): destructive links and errors. **Host Link** and **Host Focus**: link text and focus ring.

### Named Rules
**The Pressable Lime Rule.** Acid lime goes on things a team can press (lock, open slot, focus, hover) and on the single just-won stub. Never on decoration, headings, or text on the night ground outside the open slot.

**The Fabric Rule.** Team colour is a fill, never a text colour or a border on night. A team is identified by a solid band of its colour with contrast-chosen text on it.

**The Scoped World Rule.** Festivalbiljetten tokens live under `.fest` and the slate tokens live on `:root`. Do not mix them: no slate green or blue focus ring on a player screen, no indigo or lime on a host screen.

## Typography

**Display Font:** Big Shoulders Display (with Arial Narrow, sans-serif), weights 800 and 900
**Body Font:** Archivo (with system-ui, sans-serif), weights 400 and 700
**Host Font:** the system UI stack (system-ui, -apple-system, Segoe UI, Roboto)

**Character:** A tall, condensed poster face that prints years and banners like a festival line-up, set against a sturdy grotesque that stays readable in two-line team names and song titles.

### Hierarchy
- **Display** (900, clamp(3.4rem, 17vw, 4.4rem), 0.85, uppercase): the wristband headline when the screen is about us ("Er tur!", "Ni är med!", our own "Rätt!"/"Fel!").
- **Headline** (900, 2.6rem, 0.9, uppercase): the wristband headline about another team ("Kebabgängets tur", "<Lag> vann"). Wraps and hyphenates rather than shrinking.
- **Stub Year** (900, 2.5rem, 1, tabular figures, 3.1ch wide): the year on every ticket stub; also the "?" on an open slot.
- **Action** (900, 2rem, 0.06em, uppercase): the LÅS button. Its disabled prompt ("Välj en lucka") drops to 1.5rem.
- **Title** (800, 1.5rem, uppercase): section heads on the night ground ("Er tidslinje", "Lag (5)", "<Lags> tidslinje").
- **Body** (400, 1rem, 1.45): hints and running text; the hint line sits at 0.95rem in Night Muted with the instruction's key verb in bold Night Text.
- **Body Strong** (700, 1rem, 1.25): song titles on stubs; team names on bands at 0.9rem / 1.1.
- **Label** (700, 0.95rem, 0.12em, uppercase): the wristband's sub-line under the headline (team name, "Spelet är slut").
- **Small** (400, 0.85rem): artist on a stub; footer at 0.8rem; offline tag at 0.7rem bold.

### Named Rules
**The One Headline per Stub Rule.** On a stub only the year is set in the display face. Title and artist are Archivo, and nothing else on the stub competes with the year.

**The Tabular Count Rule.** Years and card counts use tabular figures so columns of stubs and band counts align.

## Layout

Single phone column: the incumbent `.screen` container (max 560px, 16px side gutter, bottom padding clearing the dock and safe area) carries both worlds. In Festivalbiljetten the wristband breaks the gutter (−16px margins) to run full-bleed at the top, padded down by the safe-area inset, with 72px of right padding reserved for the snap (116px on our own wristband, where the mascot pin is larger).

Below it, every team is visible at once in a whole-cell grid, never a sideways scroller: **2 columns for up to 8 teams, 3 columns for 9–10**, 6px gaps, 14px above. Then one hint line (14px above, 10px below), then the stub strip running full column width, then the footer line. The LÅS button docks fixed at the bottom over a night gradient (transparent to Night at 32%).

Rhythm is tight and small-stepped: 4, 6, 8, 10, 14, 16, 20px. Touch targets are at least 44px (bands, perforation buttons), stubs 72px, the lock 64px.

### Named Rules
**The Whole Room at Once Rule.** All teams fit on screen in the band grid; team names clamp to two lines instead of truncating to one or scrolling sideways.

## Elevation & Depth

Both worlds are flat. Festivalbiljetten has no drop shadows; depth comes from paper sitting on night, from the full-bleed band against the ground, and from one inset ring (`inset 0 0 0 6px rgb(23 18 46 / 0.12)`) that turns the paper snap into a pressed disc. The host console is equally shadowless, separating rows and cards from the slate by a lighter surface tone.

### Named Rules
**The Flat Print Rule.** Nothing floats. A surface is distinguished by its paper or fabric colour, never by a cast shadow.

## Shapes

Festivalbiljetten has three silhouettes. **Tickets** are near-square rectangles (6px) with a 9px semicircular notch bitten out of the middle of each side by a mask, and a 2px dashed tear line separating year from text. **Bands** are full pills (22px on a 44px band) with a round-ended count disc (14px). **Tags** are tiny ink rectangles (4px). The wristband itself is square-edged and full-bleed; its snap is a 30px circle. Perforations are 2px dashed lines; a selectable slot shows a 26px ringed plus centred on the perforation. The lock is a 10px-rounded slab.

The host console uses one radius everywhere (14px) with 10px for list rows and a 50% circle for mascot pins and team dots.

## Components

### Wristband (signature)
The top of every player screen; it tells the room whose screen this is.
- **Fill:** the owning team's colour with contrast-chosen text; Night Band when nobody owns the turn.
- **Content:** one display headline and an optional label sub-line; ours is set at Display size, other teams' at Headline size.
- **Snap:** a 30px paper disc with an inset ink ring, bottom right. When the owning team has a mascot, its pin replaces the snap: 88px on our own wristband, 60px on another team's (their names are long and keep the snap's width).
- **Motion:** wipes in left to right (`clip-path` inset, 0.5s, `cubic-bezier(0.16, 1, 0.3, 1)`) each time its owner or headline changes. It is a live status region.

### Mascot Pin (signature)
Every team is a mascot: ten characters in `src/game/mascots.ts` (name, colour, backstory), drawn as inline SVG in `src/components/Mascot.tsx`.
- **Style:** the same flat print as the rest of the world. The body is the team colour, features are Ink with a 3px stroke, and eyes, muzzles and props are Ticket Paper. No gradients, no shadows, no other colours.
- **Pin:** the mascot always sits on a round Ticket Paper disc with a faint inset ink ring, so it reads on its own team colour and on night or slate alike. Props may poke slightly past the disc, never far.
- **Moods:** `idle`, `happy` (closed smiling eyes, open mouth), `sad` (raised inner brows, frown, one paper tear) and `cheeky` (a wink and a tongue, kept for taunts). Bodies stay fixed and only the face changes.
- **Motion:** only on an animated pin (the wristband, the selected picker pin): idle bobs slowly, happy jumps twice, sad droops and stays, cheeky wiggles. Reduced motion stops all of it, and the face still carries the mood.
- **Reactions:** our lobby wristband is happy, a revealed turn makes the result team's mascot happy or sad, and the winner's mascot is happy on the end screen.
- **Accessibility:** decorative (`aria-hidden`); the team name is always next to it.

### Team Bands
- **Style:** solid team-colour pill, 44px tall, bold name left (two lines max), paper count disc right in the display face.
- **Mascot:** in the lobby (no counts) a 30px mascot pin leads the band, hidden in the three-column grid. In game the name and count need the whole width, so the band has no mascot.
- **Shown:** the band whose timeline is on screen gets a 2px Night Text outline at 2px offset; tapping a band shows that team's timeline.
- **Offline:** the name stays fully readable; a small ink "offline" tag sits under it and the count disc fades to 0.55.
- **Winner:** the count disc inverts to ink with paper figures.
- **Lobby:** counts are hidden.

### Ticket Stub (signature)
- **Corner Style:** 6px with notched sides (9px semicircles).
- **Background:** Ticket Paper, ink print; year left, tear line, title and artist, optional 44px cover art (4px rounding) right.
- **Size:** every stub is the same height (72px minimum) and scale.
- **Won:** the just-placed correct card fills Acid Lime until the next turn; its tear line and artist go ink.
- **Missed (reveal):** shown above the timeline with the year in Miss Print.

### Slots (perforations)
- **Rest:** a dashed Perforation line between stubs; non-interactive when it is not our turn.
- **Selectable:** a 44px-tall button with a ringed plus on the line; the ring turns lime on hover.
- **Open (ours):** choosing a slot tears the strip open into an unnotched stub with a 3px dashed lime edge, lime wash, a lime "?" and "Här – mellan X och Y"; it grows in (0.35s scale and fade).
- **Open (theirs):** the same stub, transparent with a Theirs Outline dashed edge and muted text, reading "De funderar här…" or "Låst här".

### Undo (fast mode)
- After a team locks in fast mode, the dock shows "↩ Ångra (5)" counting down: Night Raised fill, 2px Acid Lime edge, display face at 1.5rem. Its accessible name stays "Ångra" while the number changes. The hint above reads "Låst! Svaret visas om några sekunder.", and a locked choice carries an ink "Låst" tag. When the window closes, the dock turns into a status line ("Ångra-tiden är slut. Svaret visas strax."). Undoing returns the team to its selection with the same choice still marked, so it can change and lock again. A late tap shows "För sent att ångra" instead of an error.
- In the host lobby, fast mode is its own "Snabbläge" section with a toggle that reads "Snabbläge: på" or "Snabbläge: av" and an explanation under it.

### Film cards
- In Film mode a stub shows the film as its title line and "song – artist" as its second line; the year is the premiere year. Its picture is the film poster from TMDB in poster proportions (44×64px instead of the 44px square album art), falling back to Spotify album art. The host's answer panel and result say the film first.
- In Film mode the team footer carries the TMDB attribution ("Filmaffischer från TMDB …"), as TMDB's terms require.

### Taunts
Teams waiting for their turn tease the team that is placing, in `src/components/Taunts.tsx`.
- **Dock:** while a team places, the waiting teams get a docked button "😏 Skicka en pik": Night Raised fill, 2px Acid Lime edge, display face at 1.4rem. It opens a Night Raised panel above it: the team's own mascot line across the full width (with its pin), then the six shared lines in two columns, each a left-aligned Ticket Paper slab of 48px, so the panel covers about half the screen. The panel closes when a taunt is sent or the turn changes. After sending, the button turns dashed and muted with a countdown ("Pika igen om 7 s", or "Reagera igen om 7 s" after the reveal), counted from the team's stored taunt so it survives a reload.
- **Toast:** every phone in the game, the host's included, shows the taunt as a small wristband in the sender's team colour (22px pill, contrast-chosen text) with the sender's mascot in its cheeky mood. On team phones it slides in at the top over the wristband; on the host it sits in the flow under the turn banner so the banner always shows whose turn it is. It stays 3 s plus 60 ms per character (at most 7 s), at most two stack, and it is not pressable.
- **Reactions:** after the reveal the same dock reads "🎉 Reagera" for every team, including the one that just played. Others get cheers on a right answer ("Grattis! 🎉") or gentle teasing on a wrong one ("Oj då! 😅"), and their toast names who it is for ("Kebabgänget till Discokungarna: Grattis!"). No line claims something that may not be true, such as "nära"; the team itself gets thanks or a comeback ("Vänta bara! 😤"). Cheers and thanks show the mascot happy; teasing and comebacks show it cheeky. Taunts and reactions share the 8-second cooldown and the toast, which has a 2px ink edge and a light ring outside it so it stays visible over a wristband of the same colour.
- **Copy:** only fixed, friendly lines, so nothing needs moderating.

### Artist Choices (Familj)
Four artists for the turn, in `src/components/ArtistChoices.tsx`.
- **Style:** full-width Ticket Paper slabs, 56px minimum, 6px rounding, no notches. A letter A–D in the display face sits left of a dashed tear line, so kids can shout "B!"; the artist name is Body Strong.
- **Who sees them:** the Lätt team whose turn it is picks and then locks with the docked LÅS ("Välj en artist" until something is picked). Every other team gets the same list headed "Gissa med: vem sjunger?" and can change its guess until the reveal. A Svår team doesn't see them on its own turn.
- **Picked:** a 3px Acid Lime outline at 2px offset. A side guess also gets a status line under the list ("Ni gissar på B. Ni kan ändra tills svaret visas."), and a failed guess shows its error right there.
- **Revealed:** the right artist fills Acid Lime with an ink "Rätt svar" tag (0.85rem, 800; a long name pushes the tag to its own line), like a just-won stub; a wrong pick gets a Miss Print strike-through and an "Ert val" tag. A side guess also gets one line with the team's mascot, happy or sad.
- **Heading:** with choices on screen the timeline below always gets its own heading ("Er tidslinje"), so its first stub can't be mistaken for a fifth option.

### Buttons
- **Lock (primary):** Acid Lime slab, 64px tall, 10px rounding, ink Action type, docked at the bottom.
- **Lock disabled:** stays fully opaque, Night Raised fill, 2px dashed Perforation edge, muted 1.5rem prompt.
- **Focus (player world):** 3px Acid Lime outline at 2px offset on every button and input.
- **Links:** inherit the surrounding colour.

### Tags
- **Verdict / offline:** ink rectangle, paper text, 4px rounding; the verdict ("Det är klart – 7 kort!") in the display face at 1.1rem, 0.06em tracking, uppercase.

### Host console (incumbent)
- **Buttons:** 48px, 14px rounding, raised slate fill with border, semibold; primary is green fill with dark-green ink; `.big` is full-width 60px; disabled drops to 0.45 opacity.
- **Inputs:** 48px, slate fill, border stroke, 14px rounding; focus is a 3px blue outline.
- **Cards and rows:** slate-surface fill, 14px (cards) or 10px (rows), 16px / 12px padding; the current team row gets a 2px text-colour outline.
- **Turn banner and result:** the current team's turn banner fills with that team's colour (contrast-chosen text, 1.35rem, 800); the reveal result panel fills Host Correct or Host Wrong with a short pop-in.
- **Timeline (host):** slate-surface cards with a 6px team-colour left edge and a 1.5rem 800 year; slots are 2px dashed slate-border boxes.
- **Song picker (host lobby):** a "Låtar" section with two rows of 44px pill toggles, decades then tags. A selected pill inverts to text colour on slate with a leading ✓, so the state never rests on colour alone. Decades read 60-tal … 90-tal, then 2000-tal, 2010-tal. Under them a bold count ("15 av 163 låtar") and, when the selection may run out before anyone wins, a muted one-line warning; with fewer songs than teams the warning turns into an error and Starta spelet is disabled.
- **Year check (`/host/songs`):** songs whose Spotify album year differs by more than a year get an amber (`#fbbf24`) "Spotify har 2011, vi har 1998" line, and a summary above the list says how many to check. Amber is used only here, as a warning that may be a remaster rather than an error.
- **Mascot picker (Join, and the lobby editor):** five-column grid of mascot pins; the selected one jumps and gets a ring, mascots other teams hold are dimmed and can't be picked, and the chosen mascot's name and backstory sit under the grid.
- **Level and mode cards (Familj):** two bordered cards (3px border, 14px rounding) with a bold name and a muted one-line explanation; the selected card's border turns text-colour. Teams pick Lätt or Svår in the join form when the game is in Familj, and the player lobby shows the same two cards directly (not behind Ändra), so teams that joined before the host switched mode can still choose. On the night ground the unselected border is Night Muted at 35%. The host picks the mode with the same cards, in one column, in the lobby. The host's team lists show the level as a small badge.

## Do's and Don'ts

### Do:
- **Do** scope every player-world style under the `.fest` wrapper and set the browser theme colour to Night while it is mounted.
- **Do** give every team its own solid band of colour, with text chosen by the contrast helper.
- **Do** keep every stub the same height (72px minimum) and let only the year speak in the display face.
- **Do** keep all teams visible in the band grid: 2 columns up to 8 teams, 3 above.
- **Do** keep the disabled lock fully opaque and readable; signal "not yet" with the dashed edge and muted prompt.
- **Do** keep host and entry screens on the slate console tokens until a deliberate host redesign.

### Don't:
- **Don't** use Acid Lime on anything that cannot be pressed, except the one just-won stub.
- **Don't** set team colours as text or outlines on the night ground.
- **Don't** show teams in a sideways-scrolling tab row on the player screen; the band grid replaced it.
- **Don't** truncate team names to one line; clamp to two.
- **Don't** add drop shadows; the player world is flat print.
- **Don't** bring slate green, slate blue focus rings or system-ui type into a `.fest` screen, or lime and indigo into a host screen.
