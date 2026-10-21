// Felrapporter till Sentry. Bara fel, ingen prestandamätning eller sessionsinspelning.
// Utan VITE_SENTRY_DSN (till exempel lokalt) skickas ingenting.
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Spotify skickar inloggningskoden i adressen till /callback, och adresser kan bära annat känsligt.
 * Därför skickas aldrig query eller hash, bara sökvägen (spelkoden räcker för att hitta felet).
 */
export function stripUrl(url: string): string {
  return url.replace(/[?#].*$/, '');
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Inga användaruppgifter, cookies, headers, kroppar eller query. Lagen är anonyma och ska förbli det.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    beforeSend(event) {
      if (event.request?.url) event.request.url = stripUrl(event.request.url);
      if (event.request) {
        delete event.request.query_string;
        delete event.request.headers;
        delete event.request.cookies;
      }
      return event;
    },
    beforeBreadcrumb(crumb) {
      const data = crumb.data;
      if (data) {
        for (const key of ['url', 'from', 'to'] as const) {
          if (typeof data[key] === 'string') data[key] = stripUrl(data[key]);
        }
      }
      return crumb;
    },
  });
}

export const reactErrorHandler = Sentry.reactErrorHandler;

/**
 * Sentry ser bara fel som ingen fångar. Fel som appen själv fångar och visar, som Spotifys
 * playback_error eller ett misslyckat play-anrop, måste skickas härifrån.
 * area blir en tagg i Sentry, till exempel "spotify.playback", så att felen går att filtrera.
 * Utan DSN tas anropet bort i bygget, precis som resten av Sentry.
 */
export function reportError(error: unknown, area: string) {
  if (!dsn) return;
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), { tags: { area } });
}

/** Loopar som försöker igen rapporterar först när så här många försök i rad har misslyckats, och bara en gång. */
export const RETRIES_BEFORE_REPORT = 3;

/** Ett felmeddelande från Spotifys SDK, som bara är en text, som ett fel med ett namn som går att gruppera på. */
export function spotifyError(event: string, message: string): Error {
  const error = new Error(message);
  error.name = `Spotify ${event}`;
  return error;
}
