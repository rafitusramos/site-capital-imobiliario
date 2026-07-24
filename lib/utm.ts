const CAMPOS_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export function capturarUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  for (const campo of CAMPOS_UTM) {
    const valor = params.get(campo);
    if (valor) utm[campo] = valor;
  }

  return utm;
}
