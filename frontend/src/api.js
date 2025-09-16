import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  headers: {
    'X-API-KEY': 'admin_api_key'
  }
});

export default api;


