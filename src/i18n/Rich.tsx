import { Fragment } from 'react';

/** En översatt text där **så här** blir fetstil, så att ordningen får skilja mellan språken. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (
        <Fragment key={i}>{i % 2 ? <strong>{part}</strong> : part}</Fragment>
      ))}
    </>
  );
}
