# Kriken Låtgissning

Musikquiz med tidslinje. En spelledare med Spotify Premium spelar musiken från sin telefon, och lagen spelar från sina egna telefoner utan konto.

Live: https://krikensongguessr.web.app (Firebase-projekt `krikensongguessr`)

## Kom igång

```sh
npm install
npm run dev          # http://127.0.0.1:5173
npm test             # spelmotorn
npm run test:rules   # säkerhetsreglerna och ett helt spel mot Firestore-emulatorn (kräver Java)
npm run deploy       # bygger och deployar hosting och regler
```

`.env.local` behöver `VITE_SPOTIFY_CLIENT_ID`. För filmlistans premiärår och affischer behövs också `VITE_TMDB_API_KEY` (gratis på themoviedb.org, under Inställningar → API). Den används bara i `npm run dev` och följer aldrig med i bygget.

Felrapporter går till Sentry när `VITE_SENTRY_DSN` finns i bygget (sätt den i `.env.production.local` eller i miljön före `npm run deploy`). Utan den följer Sentry inte med alls. Bara fel skickas: ingen prestandamätning, inga användaruppgifter, cookies, headers eller query, och adresser skickas utan `?` och `#` så att Spotifys inloggningskod aldrig följer med (`src/sentry.ts`). För läsbara stackspår laddas källkartorna upp när `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` och `SENTRY_PROJECT` finns i miljön vid bygget. De raderas sedan ur `dist`, så de publiceras aldrig.

Spotify-appen behöver Redirect URI:er som matchar exakt, till exempel:

- `https://krikensongguessr.web.app/callback`
- `http://127.0.0.1:5173/callback` (utveckling)
- `https://<tunnel>/callback` om du kör via ngrok

## Fler spelledare

Spotify-appen är i Development Mode. Sedan mars 2026 betyder det högst fem Spotify-konton, inklusive ägarens, och ägaren måste ha Premium. Extended quota kräver ett företag med 250 000 aktiva användare i månaden, så den vägen är stängd. Ett konto som inte är tillagt kommer igenom inloggningen men får 403 på allt. `/callback` kollar därför `GET /me`, loggar ut vid 403 och skickar spelledaren till `/host/guide?nekad`.

`/host/guide` visar två vägar:

1. **Bli tillagd i Kriken-appen.** Spelledaren skickar namn och Spotify-e-post. Lägg till dem i [Spotifys dashboard](https://developer.spotify.com/dashboard) under appen → Settings → User Management. Det finns inget API för det.
2. **Egen Spotify-app.** Spelledaren skapar en egen app i dashboarden, med vår Redirect URI och Web API + Web Playback SDK, och klistrar in sitt Client ID. ID:t sparas bara i telefonens `localStorage` (`spotify.clientId`, se `src/spotify/auth.ts`). PKCE behöver ingen hemlighet. När appen byts loggas spelledaren ut, eftersom inloggningen hör till appen. Den egna appen har sin egen kvot hos Spotify. Guiden minns var spelledaren är (`guide.step`, `guide.clientId`) om fliken laddas om under besöket hos Spotify. Ett ID sparas som `spotify.clientId` först när inloggningen med det har fungerat, och en nekad inloggning återställer den som fanns innan, så att en felaktig länk aldrig loggar ut en spelledare mitt i spelet. På datorn visar guiden till sist en QR-kod (`/host/guide?app=<id>`) som för över appen till telefonen.

## Vyer

| Sökväg | Vem | Vad |
| --- | --- | --- |
| `/` | Alla | Skapa spel eller skriv kod |
| `/host` | Spelledare | Spotify-inloggning, skapa eller fortsätt spel |
| `/host/:code` | Spelledare | Lobby med QR, turer, musik, avslöja, resultat |
| `/host/songs` | Spelledare | Koppla låtar till Spotify, provspela, exportera JSON |
| `/host/guide` | Ny spelledare | Bli tillagd i Kriken-appen eller använd en egen Spotify-app |
| `/join/:code` | Lag | Lagnamn och maskot |
| `/play/:code` | Lag | Lobby, tidslinje, placera och lås |

## Struktur

- `src/engine/game.ts` – rena funktioner: placeringskontroll, turordning, kortlek, vinst. Testas i `game.test.ts`.
- `src/game/` – Firestore-modellen. `hostActions.ts` är allt spelledaren skriver, `teamActions.ts` allt ett lag skriver.
- `src/spotify/` – PKCE med refresh (`auth.ts`), Web Playback SDK-spelaren på modulnivå (`player.ts`), låtlistan (`catalog.ts`).
- `firestore.rules` – lagen läser aldrig `private/*`, drag bara från laget i tur under `placing`.
- `tests/` – regeltester och ett helt spel med tre lag mot emulatorn.

## Låtlistan

`src/data/songs.json` har titel, artist, originalår och ibland etiketter (`tags`). `spotifyUri` får vara tom: spelledarens telefon söker då fram spåret första gången och sparar svaret lokalt. Öppna `/host/songs`, tryck **Hitta alla på Spotify**, provspela, rätta fel träffar med ✎ och ladda ner en `songs.json` med URI:erna ifyllda.

**Årtalen är hela spelet.** `year` ska vara låtens första utgivning, inte remasterns eller samlingens. Tryck **Kontrollera år** i `/host/songs` för att se låtar där Spotifys albumår skiljer sig med mer än ett år. Ofta är det en remaster, men ibland fel år hos oss.

**Etiketter:** `svenskt`, `melodifestivalen`, `dans`, `rock` och `hiphop` (listan finns i `src/engine/library.ts`). En låt kan ha flera eller inga. I lobbyn väljer spelledaren decennier och etiketter (`settings.songFilter` på spelet). Inget valt betyder alla låtar, och inom decennier respektive etiketter räcker det att låten passar en av dem. Lobbyn varnar när urvalet kan ta slut innan någon vinner, och går inte att starta med färre låtar än lag. Film- och barnlåtar väntar på ett eget spelläge (#13).

Spotify-sökningen väljer en ren version (utan svordomar) när det finns en lika bra träff. Låtar med `spotifyUri` i `songs.json`, eller som redan finns i spelledarens cache, påverkas inte.

## Spellägen

Spelledaren väljer läge i lobbyn (`settings.mode` på spelet, saknas det gäller tidslinje).

- **Tidslinje:** som från början.
- **Familj:** varje lag väljer nivå när det går med (`level` på laget, går bara att byta i lobbyn). Ett lätt lag väljer artist bland fyra (`choices` på spelet, `choice` i draget) och får kortet i årsordning om det är rätt. Ett svårt lag lägger i tidslinjen. Övriga lag gissar med (`guess` på laget, bara medan turen pågår), vilket inte ger några kort. Nivån sparas även i tidslinjeläget men används inte där, så att spelledaren kan byta läge i lobbyn utan att lagen behöver gå med igen. Lag som gick med före bytet är svåra tills de väljer nivå i lobbyn. Alternativen väljs i `src/engine/artist.ts`.
- **Film:** en egen lista, `src/data/films.json`, med låt, artist, film och filmens premiärår (`year`). Alla lag gissar filmen bland fyra (`choices` på spelet), och rätt svar läggs i tidslinjen efter premiäråret. Decennierna i urvalet gäller, etiketterna inte. Listan kontrolleras och kopplas till Spotify i `/host/songs?lista=film`. Där hämtar **Hämta från TMDB** varje films premiärår, svenska titel och affisch från TMDB (The Movie Database) och flaggar skillnader. När du laddar ner `films.json` sparas TMDB:s år, `tmdbId` och `poster` (sökväg till affischen). Titlarna rättas för hand, eftersom TMDB ibland saknar svensk översättning. I spelet visar Film-korten affischen, och albumbilden från Spotify används bara när affisch saknas. Spelet anropar aldrig TMDB, det visar bara bilderna från TMDB:s bildserver.

**Fortsätt eller lås** (`settings.streak`, i alla lägen, på i nya spel): efter ett rätt svar väljer laget på sin telefon att låsa in eller fortsätta med en ny låt. Korten sedan senaste inlåsningen ligger osäkrade i lagets tidslinje och listas i `game.streak` (`{ teamUid, cardIds }`). Ett fel tar bort dem alla (`lastResult.lost` säger hur många), och turen går vidare. Når laget mållängden, osäkrade kort inräknade, vinner det direkt. Laget skriver sitt val som `streakChoice: { turnIndex, action, at }` på sitt lagdokument (`at` är serverns tid). Reglerna tillåter det bara för laget i tur och bara efter dess eget rätta svar som inte gav vinst. Laget kan ångra sig inom tre sekunder, en gång per tur: ångrat sparas som `action: 'undone'`, och valet efter det måste ha `undone: true`, så att ingen kan hålla spelet stilla genom att välja och ångra. Knapparna tar inte emot tryck de första 0,6 sekunderna, eftersom Lås nyss satt på samma ställe. Spelledarens telefon ser valet (`src/hooks/streakDecision.ts`), väntar ut ångerfönstret, läser valet igen och drar nästa kort åt samma lag (`nextTurn(..., { sameTeam: true })`) eller går till nästa lag. `nextTurn` läser turen igen i en transaktion, så att två tryck i samma ögonblick inte drar två kort. Svarar laget inte på 20 sekunder visar spelledarens telefon reservknappar, och Fortsätt frågar först. Medan ett lag väljer kan de andra lagen hetsa det med egna pikar (`DECISION_TAUNTS` i `src/game/taunts.ts`). Ett fel visar de tappade korten som rivna spöken under avslöjandet. Spelet slutar inte med att osäkrade kort tappas: tar kortleken slut, eller avslutar spelledaren, räknas de. Hoppar spelledaren över ett lag mitt i en svit låses sviten in. Spel från före funktionen saknar inställningen och spelas som förut. Reglerna i `src/engine/streak.ts`.

**Snabbläge** (`settings.fastMode`, i alla lägen): när ett lag låser har det fem sekunder att ångra (dragets `createdAt` är serverns tid, och reglerna tillåter att laget tar bort sitt drag bara inom fönstret). Spelledarens telefon avslöjar sedan själv (`src/hooks/autoReveal.ts`), räknat från när den ser draget plus lite marginal, så att olika klockor inte spelar roll. Ett lag som ångrar om och om igen kan inte skjuta upp avslöjandet mer än tolv sekunder från turens första drag. Draget måste ha serverns tid (`createdAt`). Knappen Avslöja finns kvar om telefonen tappar anslutningen.

## Pikar

Medan ett lag placerar kan de andra lagen skicka en färdig pik (`src/game/taunts.ts`), eller sin maskots egen replik. Piken sparas som `taunt` på avsändarens lagdokument, och alla telefoner visar den i några sekunder (längre för längre text). Reglerna tillåter bara färdiga texter, pikar bara medan ett annat lag placerar, och högst en per lag var åttonde sekund enligt serverns klocka.

Efter avslöjandet kan alla lag reagera i samma fält, med samma spärr: de andra gratulerar vid rätt och retas vid fel, och laget självt tackar eller lovar revansch. Reglerna skiljer bara på pikar (under turen) och reaktioner (efter avslöjandet). Vilka reaktioner som passar väljer appen.

## Avvikelser från projektbriefen

- `turnIndex` är turens löpnummer och fortsätter räkna mellan omgångar, så att gamla drag aldrig matchar en ny tur. Drag sparas som `moves/{turnIndex}`, ett per tur.
- **Hoppa över laget** kasserar kortet och drar ett nytt till nästa lag.
- **Spela igen** återställer samma spel till lobbyn med samma kod och lag.
- Inget service worker (installerbar via manifestet), så att en ny deploy alltid syns direkt.
