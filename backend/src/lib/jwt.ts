// Segredo usado para assinar e validar os tokens de sessão.
// Sem fallback: um valor padrão no código permitiria forjar tokens se o .env faltar.
// É lido a cada chamada (e não no import) para que os testes possam defini-lo.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não definido: configure a variável de ambiente.');
  }
  return secret;
}
