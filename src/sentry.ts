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
