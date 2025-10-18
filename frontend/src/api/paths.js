const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';

export default {
  base: API_PREFIX,
  whoami: API_PREFIX + '/whoami',
  login: API_PREFIX + '/login',
  logout: API_PREFIX + '/logout',

  socket: API_PREFIX + '/cmd-socket',

  signup: {
    checkUsername: API_PREFIX + '/signup/check-username',
    signup: API_PREFIX + '/signup',
  }
}
