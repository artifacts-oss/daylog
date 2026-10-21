// Strict route-param ID parser: digits only and a safe integer, otherwise NaN.
export function parseId(value: string): number {
  const id = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  return Number.isSafeInteger(id) ? id : Number.NaN;
}
