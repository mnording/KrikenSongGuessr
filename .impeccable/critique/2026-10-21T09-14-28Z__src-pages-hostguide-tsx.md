---
target: HostGuide onboarding (egen Spotify-app)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\Matti\\Documents\\Totejmedia\\Clients\\TotejMedia\\KrikenSongGuessr\\src\\pages\\HostGuide.tsx"
target_fingerprint: "sha256:f41eb081588d433f0ca7fdbc1ec9ba853dc8460b2b57dc2ae09fc465b1d21705"
target_path: "C:\\Users\\Matti\\Documents\\Totejmedia\\Clients\\TotejMedia\\KrikenSongGuessr\\src\\pages\\HostGuide.tsx"
timestamp: 2026-10-21T09-14-28Z
slug: src-pages-hostguide-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristik | Poäng | Huvudproblem |
|---|---|---|---|
| 1 | Systemstatus | 2 | Ingen "loggar in…", "Byt tillbaka" uppdaterar inte raden "Du använder din egen app nu" |
| 2 | Verkligheten | 2 | Client ID, Redirect URI, SDK oförklarade; "appen" betyder två saker |
| 3 | Kontroll | 2 | Fel ID sparas direkt och förstör vanliga inloggningen på /host |
| 4 | Konsekvens | 3 | På systemet; felet under knappen i stället för fältet |
| 5 | Förebygga fel | 1 | Client secret är också 32 hex och går igenom; Redirect URI-fel fångas inte |
| 6 | Känna igen | 2 | Stegen måste minnas på Spotifys sida, ofta annan enhet |
| 7 | Flexibilitet | 3 | Kopieraknapp; saknar sätt att föra ID till telefonen |
| 8 | Minimalism | 3 | Lugn, men båda vägarna väger lika |
| 9 | Återhämtning | 1 | Fel hos Spotify (INVALID_CLIENT) strandar på engelsk sida |
| 10 | Hjälp | 2 | Ingen felsökning, ingen "var hittar jag" |
| **Totalt** | | **21/40** | **Acceptabel** |

## Priority issues
- [P0] Fel enhet: Client ID sparas på datorn där man gör stegen, inte på spelledarens telefon. Fix: efter sparning, QR/länk med ID till telefonen; säg det i början.
- [P0] Fel hos Spotify strandar och ett fel ID förgiftar vanlig inloggning. Fix: spara ID som väntande, bekräfta först efter lyckad /me; felsökningsruta med de tre vanliga orsakerna; "Client ID, inte Client secret".
- [P1] Vägg av steg, ingen landning. Fix: stegvis checklista med Klart per steg, sparad progress; riktig "Klart, du är spelledare".
- [P1] Valet mellan vägarna är otydligt ("Snabbast" vs "Utan väntan"). Fix: "Be Mattias" med färdigt meddelande att dela, "Fixa själv".
- [P2] Jargong och den läskiga stunden. Fix: en rads förklaring per term, lugnande rad före steg 1.

## Detector
CLI: 0 findings. Overlay: 1 LOW CONTRAST TEXT (placeholder 3.87:1). Mätt: dashboardlänken 21px hög (inline, under 44px). Ingen horisontell overflow vid 390px.
