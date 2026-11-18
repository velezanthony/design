/** Une los ids que describen un campo, sin huecos: lo propio de quien lo usa primero, luego ayuda y error. */
export function describedBy(...ids: (string | null | undefined | false)[]) {
  const joined = ids.filter(Boolean).join(' ');
  return joined === '' ? undefined : joined;
}
