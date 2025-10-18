import paths from "./paths";

export async function Login({ username, password }) {
  let response;
  try {
    response = await fetch(paths.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    console.error("Failed to initialize login request:", err);
    return { authorized: false, reason: err };
  }

  switch (response.status) {
    case 200:
      return { authorized: true, reason: 200 };
    case 400: {
      const response_body = await response.json().catch(() => ({}));
      return {
        authorized: false,
        reason: 400,
        message: response_body.error ?? "invalid request",
      };
    }
    case 401:
      return { authorized: false, reason: 401 };
    case 403:
      return {
        authorized: false,
        reason: 500,
        message: "all user roles should be able to log in.",
      };
    default:
      return {
        authorized: false,
        reason: 400,
        message: "Unknown status code received: " + response.status,
      };
  }
}

export async function Signup({ token, username, password }) {
  let response;
  try {
    response = await fetch(paths.signup.signup, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, username, password }),
    });
  } catch (err) {
    console.error("Failed to initialize signup request:", err);
    return { success: false, reason: err };
  }

  switch (response.status) {
    case 200:
    case 201:
      return { success: true, reason: response.status };
    case 400: {
      const response_body = await response.json().catch(() => ({}));
      return {
        success: false,
        reason: 400,
        message: response_body.error ?? "invalid request",
      };
    }
    case 401:
      return { success: false, reason: 401, message: "Invalid or expired token" };
    case 409:
      return { success: false, reason: 409, message: "Username already exists" };
    default:
      return {
        success: false,
        reason: 400,
        message: "Unknown status code received: " + response.status,
      };
  }
}

export async function CheckSignupUsername({ token, username }) {
  let response;
  try {
    response = await fetch(`${paths.signup.checkUsername}/${username}?token=${token}`, {
      method: "GET",
    });
  } catch(err) {
    console.error("Failed to initialize chkusername request:", err);
    return { success: false, reason: err };
  }

  switch (response.status) {
    case 200:
      return { success: true, reason: 200 };
    case 400: {
      const response_body = await response.json().catch(() => ({}));
      return { success: false, reason: 400, message: response_body.error || 'invalid request' };
    }
    case 401:
      return { success: false, reason: 401, message: 'Invalid or expired token' };
    case 409:
      return { success: false, reason: 409, message: 'Username already taken' };
    case 500:
      return { success: false, reason: response.status };
    default:
      return {
        success: false,
        reason: 400,
        message: "Unknown status code received: " + response.status,
      };
  }
}

export async function IsAuthorized() {
  let response;
  try {
    response = await fetch(paths.socket);
  } catch(err) {
    console.error("Failed to initialize isauth request:", err);
    return false
  }

  if (response.status === 400) {
    return true
  }

  return false
}
