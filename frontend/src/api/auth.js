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
    case 400:
      return {
        authorized: false,
        reason: 400,
        message: response_body.error ?? "invalid request",
      };
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
