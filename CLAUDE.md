# Kriken Låtgissning

Läs `README.md` först: kom igång, struktur, spellägen och felrapporter. `DESIGN.md` och `PRODUCT.md` gäller för gränssnittet.

## Fel ska nå Sentry

Sentry ser bara fel som ingen fångar. När du skriver en `catch`, en `.catch()` eller lyssnar på ett event som bär ett felmeddelande:

- Anropa `reportError(err, '<område>.<vad>')` från `src/sentry.ts` innan felet visas eller sväljs, om spelaren inte orsakat det själv.
- Gör om fel som bara är text till riktiga fel (`spotifyError(event, message)` eller `new Error` med ett `name`).
- Sväljer du ett väntat fel (till exempel `permission-denied` när ett fönster har stängt, eller ett hjärtslag på dåligt nät), skriv en kommentar som säger varför det inte rapporteras.
- Inga lagnamn, e-postadresser, tokens eller hela adresser i felmeddelanden.

Hela regeln, med exempel, står under "Felrapporter" i `README.md`.
