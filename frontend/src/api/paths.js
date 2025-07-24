const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';

export default {
  base: API_PREFIX,
  whoami: API_PREFIX + '/whoami',
  login: API_PREFIX + '/login',
}
