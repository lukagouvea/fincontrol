import api from './api';

export const login = async (credentials: any) => {
  const response = await api.post('/users/login', credentials);
  return response.data;
};

export const signup = async (userInfo: any) => {
  const response = await api.post('/users/signup', userInfo);
  return response.data;
};
