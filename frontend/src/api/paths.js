const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';

export default {
  base: API_PREFIX,
  whoami: API_PREFIX + '/whoami',
  login: API_PREFIX + '/login',
  logout: API_PREFIX + '/logout',

  signup: {
    create_token: API_PREFIX + '/signup-tokens',
    signup: API_PREFIX + '/signup',
  }
}
