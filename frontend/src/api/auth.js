import paths from "./paths";

export async function WhoAmI() {
  let response;
  try {
    response = await fetch(paths.whoami); 
  } catch(err) {
    console.error("Failed to initialize whoami request:", err);
    return {authorized: false, reason: 400, err};
  }

  switch(response.status) {
    case 200:
      try {
        const body = await response.json();
        if(!body.id || !body.name || !body.email || !body.phone || !body.role) {
          return {authorized: false, reason: 400, body};
        }
        return {authorized: true, reason: 200, user: {
          id: body.id,
          name: body.name,
          email: body.email,
          phone: body.phone,
          role: body.role,
        }};

      } catch(err) {
        console.error("Error fetching whoami:", err);
        return {authorized: false, reason: 500};
      }
    case 401:
      return {authorized: false, reason: 401};
    case 403:
      return {authorized: false, reason: 500, message: "whoami should work for all users, but got 403"};
    default:
      return {authorized: false, reason: 400, message: "Unknown status code received: " + response.status};
  }
}

export async function Login({ email, pwd }) {
  let response;
  try {
    response = await fetch(paths.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({email, pwd})
    });
  } catch(err) {
    console.error("Failed to initialize login request:", err)
    return {authorized: false, reason: err};
  }

  switch(response.status) {
    case 200:
      return {authorized: true, reason: 200};
    case 401:
      return {authorized: false, reason: 401};
    case 403:
      return {authorized: false, reason: 500, message: "all user roles should be able to log in."};
    default:
      return {authorized: false, reason: 400, message: "Unknown status code received: " + response.status};
  }
}
