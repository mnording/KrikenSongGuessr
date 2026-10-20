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

`.env.local` behöver `VITE_SPOTIFY_CLIENT_ID`.

Spotify-appen behöver Redirect URI:er som matchar exakt, till exempel:

- `https://krikensongguessr.web.app/callback`
- `http://127.0.0.1:5173/callback` (utveckling)
- `https://<tunnel>/callback` om du kör via ngrok

## Vyer

| Sökväg | Vem | Vad |
| --- | --- | --- |
| `/` | Alla | Skapa spel eller skriv kod |
| `/host` | Spelledare | Spotify-inloggning, skapa eller fortsätt spel |
| `/host/:code` | Spelledare | Lobby med QR, turer, musik, avslöja, resultat |
| `/host/songs` | Spelledare | Koppla låtar till Spotify, provspela, exportera JSON |
| `/join/:code` | Lag | Lagnamn och maskot |
| `/play/:code` | Lag | Lobby, tidslinje, placera och lås |

## Struktur

- `src/engine/game.ts` – rena funktioner: placeringskontroll, turordning, kortlek, vinst. Testas i `game.test.ts`.
- `src/game/` – Firestore-modellen. `hostActions.ts` är allt spelledaren skriver, `teamActions.ts` allt ett lag skriver.
- `src/spotify/` – PKCE med refresh (`auth.ts`), Web Playback SDK-spelaren på modulnivå (`player.ts`), låtlistan (`catalog.ts`).
- `firestore.rules` – lagen läser aldrig `private/*`, drag bara från laget i tur under `placing`.
- `tests/` – regeltester och ett helt spel med tre lag mot emulatorn.

## Låtlistan

`src/data/songs.json` har titel, artist och originalår. `spotifyUri` får vara tom: spelledarens telefon söker då fram spåret första gången och sparar svaret lokalt. Öppna `/host/songs`, tryck **Hitta alla på Spotify**, provspela, rätta fel träffar med ✎ och ladda ner en `songs.json` med URI:erna ifyllda.

## Avvikelser från projektbriefen

- `turnIndex` är turens löpnummer och fortsätter räkna mellan omgångar, så att gamla drag aldrig matchar en ny tur. Drag sparas som `moves/{turnIndex}`, ett per tur.
- **Hoppa över laget** kasserar kortet och drar ett nytt till nästa lag.
- **Spela igen** återställer samma spel till lobbyn med samma kod och lag.
- Inget service worker (installerbar via manifestet), så att en ny deploy alltid syns direkt.
