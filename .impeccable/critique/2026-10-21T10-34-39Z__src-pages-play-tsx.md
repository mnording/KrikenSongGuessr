---
target: Fortsätt eller lås på lagets telefon
total_score: 20
max_score: 36
na_heuristics: 7
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\Matti\\Documents\\Totejmedia\\Clients\\TotejMedia\\KrikenSongGuessr\\src\\pages\\Play.tsx"
target_fingerprint: "sha256:884b16e13bab597300d54e70daa6f7bea0fdba15e8a1767314a63d2ec55ca0e9"
target_path: "C:\\Users\\Matti\\Documents\\Totejmedia\\Clients\\TotejMedia\\KrikenSongGuessr\\src\\pages\\Play.tsx"
timestamp: 2026-10-21T10-34-39Z
slug: src-pages-play-tsx
---
Method: dual-agent (A: design review · B: detector + browser)
Target: Fortsätt eller lås, team phone (src/pages/Play.tsx)

| # | Heuristik | Poäng |
|---|---|---|
| 1 | Systemstatus | 2 |
| 2 | Verkligheten | 3 |
| 3 | Kontroll | 1 |
| 4 | Konsekvens | 2 |
| 5 | Förebygga fel | 1 |
| 6 | Känna igen | 3 |
| 7 | Flexibilitet | n/a |
| 8 | Minimalism | 3 |
| 9 | Återhämtning | 2 |
| 10 | Hjälp | 3 |
| Totalt | | 20/36 |

## Priority issues
- [P0] Reflextryck blir Fortsätt, går inte att ångra. Fix: lika breda knappar, 0,6 s spärr, 3 s ångra.
- [P1] Armbandet äger inte stunden ("Ni fick kortet" fast osäkrat). Fix: "FORTSÄTT ELLER LÅS?" + "2 kort står på spel"; "<LAG> VÄLJER…" för andra.
- [P1] Osäkrade kort osynliga (lime på papper 1.05:1) och lime på icke-tryckbart. Fix: ink-streck, ink-stämpel, lätt lutning, gruppetikett.
- [P2] "2+2" i armbandsräknaren radbryts och rinner över. Fix: en rad, etikett på knappen.
- [P2] Ingen belöning vid inlåsning, ingen synlig förlust. Fix: stämpel-animation, rivna spöken.

## Detector
CLI 0. Overlay: wristband-sub kontrast 4.1:1 (befintlig), stub-year 2003 overflow (befintlig). Mätt: dock full bredd på desktop.
