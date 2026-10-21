# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The Kriken crew, a private friend group, playing together in one room on a game night. Two roles:

- **Spelledare (host):** one person with Spotify Premium who runs the game from their phone. That phone plays the music into a speaker, starts the turns, reveals the answers and moves the game along.
- **Lag (teams):** 2–10 teams of friends, each playing from one of their own phones with no account. They join with a 6-digit code or a QR code, pick a team name and a mascot (which brings the team colour), listen, and place the song in their timeline.

The game is not intended for anyone outside the group. Future Kriken game nights may reuse it.

## Product Purpose

A music-timeline guessing game in the style of Hitster. A song plays, and the team whose turn it is places it on their timeline by release year. A correct placement keeps the card. The first team to reach the target (default 7 cards, adjustable from 3 to 15) wins.

Success means the evening runs without friction. Joining is instant, the music plays reliably, turns and reveals are clear to the whole room, and nobody has to explain the app twice.

## Positioning

The crew's own game. It is named for the group, it uses a song list the group chose itself, and it runs on the host's Spotify, so nobody needs to buy cards or create an account.

## Operating Context

- Phones only, in a social and often loud room with people moving around. There is no shared TV or big screen; each phone is the only view its holder has.
- Audio comes from the host's phone through a speaker. Team phones never play sound.
- The game is played in short turns. People look at their phones in bursts between talking, so the current state has to be readable at a glance.
- Players can reconnect mid-game (phones lock, browsers reload), and the host can continue a game in progress.

## Capabilities and Constraints

- Routes: `/` (join with a code or create a game), `/host` (Spotify login, create or continue), `/host/:code` (lobby with QR, turns, music, reveal, results), `/host/songs` (match songs to Spotify, preview, export JSON), `/join/:code` (team name and mascot), `/play/:code` (lobby, timeline, place and lock).
- Stack: React 19, Vite, TypeScript, React Router, Firebase (Firestore with anonymous auth, Hosting), Spotify Web Playback SDK with PKCE. Live at https://krikensongguessr.web.app.
- The host needs Spotify Premium. Teams need nothing.
- Game modes, picked by the host in the lobby: **Tidslinje** (everyone places the song in their timeline by year) and **Familj** (for kids 9–14 playing with parents). In Familj each team picks a level when it joins: *Lätt* picks the artist among four, *Svår* places in the timeline. A Lätt team that picks right gets the card in year order, so everyone still races to the same number of cards. The teams whose turn it isn't can guess the artist too; it gives no cards, only the mascot's reaction. **Film** uses its own list of film songs (`src/data/films.json`, premiere years and posters from TMDB): every team guesses which film the song comes from, among four, and a right guess places the card by the film's premiere year. More modes are expected, so the mode is a setting rather than a separate route.
- Continue or lock ("Fortsätt eller lås", a lobby setting for any mode, on by default): after a right answer the team chooses on its own phone to lock in its cards and pass the turn, or to keep going with another song. Cards since the last lock-in are unsecured, and one wrong answer loses all of them. Reaching the target with unsecured cards wins at once. The host has the same two buttons as a fallback.
- Fast mode (a lobby setting for any mode): when a team locks, it has five seconds to undo, and then the host's phone reveals the answer by itself. The host still starts the next song.
- Taunts and reactions: while one team places, the waiting teams can send a fixed, friendly taunt (six shared lines plus one per mascot). After the reveal every team can react: others cheer or tease, the team itself thanks or promises a comeback. Everyone in the game sees it for a few seconds with the sender's mascot. Each team can send at most one every 8 seconds.
- Song library: `src/data/songs.json`, each song with its original year and optional tags (svenskt, melodifestivalen, dans, rock, hiphop). In the lobby the host can narrow the deck to some decades and tags; the lobby warns when the selection may run out. `/host/songs` can check our years against Spotify.
- When resolving a song on Spotify the host's phone prefers a clean (non-explicit) version when one exists.
- Song list: `src/data/songs.json`, 65 songs with title, artist and original year, spanning from 1964 onwards.
- Host actions include skipping a team (discard the card and draw a new one) and playing again (same code and teams, back to the lobby).
- Installable through the web manifest. There is deliberately no service worker, so each new deploy shows up immediately.
- Current stage: a working POC built 2026-10-16 for the game night on 2026-10-17. Reliability (playback, reconnects, turn flow) outranks new features. Post-POC ideas (tokens, evaluating placements in a Cloud Function, a song library in Firestore) are not decided yet.

## Brand Commitments

- Name: **Kriken Låtgissning** (short name "Låtgissning"). Kriken is the crew's own name, and the identity should stay with it.
- "Hitster" is a trademark and must not be used as the product name or in its branding.
- All UI copy is in Swedish. The tone is plain and friendly, written as direct instructions ("Lyssna på låten och lägg den rätt i er tidslinje.").

## Evidence on Hand

- The real song list is in `src/data/songs.json`.
- Icons: `public/icon.svg` and `public/favicon.svg`.
- There are no testimonials, photos or other brand assets, and none should be invented.

## Product Principles

1. **The evening comes first.** Anything that could stall the room (playback, joining, reconnecting, turn handoff) matters more than any feature or flourish.
2. **Glanceable on any phone.** Whose turn it is and what to do now should be clear in a second, across a noisy room, on a phone the player has never used for this before.
3. **No accounts and no setup for teams.** A code or a QR scan and a team name are the entire onboarding.
4. **The host's phone runs the show.** The host's controls should be confident and safe to use mid-conversation, with hard-to-hit-by-accident actions for anything that changes the game.
5. **It belongs to the crew.** It is a private, personal game, not a generic product, and it can carry the group's in-jokes and name.
