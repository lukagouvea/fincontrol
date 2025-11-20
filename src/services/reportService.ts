import api from './api';

export const getMonthlyReport = async (month: number, year: number) => {
  const response = await api.get('/reports/monthly', {
    params: { month, year },
  });
  return response.data;
};

export const getAnnualReport = async (year: number) => {
  const response = await api.get('/reports/annual', {
    params: { year },
  });
  return response.data;
};
