const CURRENT_YEAR = new Date().getFullYear();

export function getYtd(collab: { approved_lordo_ytd: number; approved_year: number }): number {
  return collab.approved_year === CURRENT_YEAR ? Number(collab.approved_lordo_ytd) : 0;
}

export function isOverMassimale(
  ytd: number,
  incoming: number,
  massimale: number | null,
): boolean {
  if (!massimale) return false;
  return ytd + incoming > massimale;
}
