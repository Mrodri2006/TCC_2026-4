const STATES: Record<string, string> = {
  ac: "acre", al: "alagoas", ap: "amapa", am: "amazonas", ba: "bahia",
  ce: "ceara", df: "distrito federal", es: "espirito santo", go: "goias",
  ma: "maranhao", mt: "mato grosso", ms: "mato grosso do sul", mg: "minas gerais",
  pa: "para", pb: "paraiba", pr: "parana", pe: "pernambuco", pi: "piaui",
  rj: "rio de janeiro", rn: "rio grande do norte", rs: "rio grande do sul",
  ro: "rondonia", rr: "roraima", sc: "santa catarina", sp: "sao paulo",
  se: "sergipe", to: "tocantins",
};

export const normalizeLocation = (value: string) => (value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const stateCode = (value: string) => {
  const normalized = normalizeLocation(value);
  if (STATES[normalized]) return normalized;
  return Object.keys(STATES).find((code) => STATES[code] === normalized) || "";
};

const parseLocation = (value: string) => {
  const parts = String(value || "").split(/\s+-\s+|,\s*/).map(normalizeLocation).filter(Boolean);
  return { city: parts[0] || "", state: stateCode(parts[1] || "") };
};

/** Compara cidade e, quando informada pelos dois usuários, também a UF. */
export const isSameCity = (first: string, second: string) => {
  const a = parseLocation(first);
  const b = parseLocation(second);
  if (!a.city || !b.city || a.city !== b.city) return false;
  if (a.state && b.state) return a.state === b.state;
  return true;
};
