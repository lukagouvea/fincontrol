import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // 20 usuários tentando logar ao mesmo tempo é MUITO para 1GB
  ],
};

export default function () {
  const url = 'http://167.234.227.195/api/auth/login';
  const payload = JSON.stringify({
    email: 'email.cadastrado@exemplo.com',
    password: 'senha_errada_pra_forcar_processamento',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  
  // Esperamos 401 (Não autorizado) ou 200 (Sucesso)
  // Se vier 500 ou 502, o servidor caiu.
  check(res, { 'status 200 ou 401': (r) => r.status === 200 || r.status === 401 });

  sleep(1);
}