export function statusOf(err: unknown): number | null {
  const m = err instanceof Error ? err.message : String(err ?? "");
  if (m.includes("UNAUTHENTICATED")) return 401;
  const r = m.match(/HTTP_(\d{3})/);
  return r ? Number(r[1]) : null;
}

export function messageForStatus(status: number | null) {
  switch (status) {
    case 400: return "Dados inválidos. Revise os campos e tente novamente.";
    case 401: return "Sua sessão expirou. Entre novamente.";
    case 404: return "Não encontrado.";
    case 409: return "Já existe um cadastro com esses dados.";
    case 503: return "Serviço indisponível no momento. Tente novamente em instantes.";
    default: return "Algo deu errado. Tente novamente.";
  }
}

export const errorMessage = (err: unknown) => messageForStatus(statusOf(err));
