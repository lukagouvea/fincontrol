import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração do Teste
export const options = {
  // Estágios do ataque
  stages: [
    { duration: '30s', target: 50 },  // Sobe para 50 usuários simultâneos em 30s
    { duration: '1m', target: 50 },   // Mantém 50 usuários por 1 minuto
    { duration: '10s', target: 0 },   // Desce para 0 (Resfriamento)
  ],
  // Define limites para considerar o teste um sucesso
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem ser mais rápidas que 500ms
  },
};

export default function () {
  // 1. Testa a rota pública (Health Check)
  // Substitua pelo seu IP Público
  const res = http.get('http://167.234.227.195/api/'); 

  // 2. Valida se deu 200 OK
  check(res, { 'status was 200': (r) => r.status == 200 });

  // Pausa aleatória entre 0.1s e 1s (simula usuário humano clicando rápido)
  sleep(1);
}