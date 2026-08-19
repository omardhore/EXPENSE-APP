/**
 * Neutralizes CSV formula injection: a cell whose value begins with
 * = + - @ (or tab/CR) is interpreted as a formula by Excel/Sheets when the
 * file is opened, so user-entered text needs a leading apostrophe to force
 * it to be read as plain text.
 */
export function sanitizeCsvField(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}
