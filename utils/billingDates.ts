const lastDayOfMonth = (year: number, month0: number) => new Date(year, month0 + 1, 0).getDate();

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function computeNextDueDate(dataCadastro: Date, fromDate: Date = new Date()): Date {
  const cadastro = startOfDay(dataCadastro);
  const from = startOfDay(fromDate);
  const day = cadastro.getDate();
  const y = from.getFullYear();
  const m = from.getMonth();

  const candidateDay = Math.min(day, lastDayOfMonth(y, m));
  const candidate = new Date(y, m, candidateDay);
  if (candidate <= from) {
    const nm = m + 1;
    const ny = y + Math.floor(nm / 12);
    const m0 = ((nm % 12) + 12) % 12;
    const d2 = Math.min(day, lastDayOfMonth(ny, m0));
    return new Date(ny, m0, d2);
  }
  return candidate;
}

