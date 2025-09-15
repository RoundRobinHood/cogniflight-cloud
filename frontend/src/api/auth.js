import paths from "./paths";

export async function WhoAmI() {
  let response;
  let response_body;
  try {
    response = await fetch(paths.whoami); 
    let text = await response.text();
    if(text.length != 0) {
      response_body = JSON.parse(text);
    } else {
      response_body = {};
    }
  } catch(err) {
    console.error("Failed to initialize whoami request:", err);
    return {authorized: false, reason: 400, err};
  }

  switch(response.status) {
    case 200:
      try {
        const body = response_body;
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
    case 400:
      return {authorized: false, reason: 400, message: response_body.error ?? "invalid request"}
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
    case 400:
      return {authorized: false, reason: 400, message: response_body.error ?? "invalid request"}
    case 401:
      return {authorized: false, reason: 401};
    case 403:
      return {authorized: false, reason: 500, message: "all user roles should be able to log in."};
    default:
      return {authorized: false, reason: 400, message: "Unknown status code received: " + response.status};
  }
}

export async function CreateSignupToken({ phone, email, role }) {
  let response;
  let response_body;
  try {
    response = await fetch(paths.signup.create_token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({email,phone,role})
    });
    let text = await response.text();
    if(text.length != 0) {
      response_body = JSON.parse(text);
    } else {
      response_body = {};
    }
  } catch(err) {
    console.error("Failed to send create-token request:", err);
    return {token: null, reason: err};
  }

  switch(response.status) {
    case 201:
      return {token: response_body.tok_str, reason: 201};
    case 400:
      return {authorized: false, reason: 400, message: response_body.error ?? "invalid request"}
    case 401:
      return {token: null, reason: 401};
    case 403:
      return {token: null, reason: 403};
    default:
      return {token: null, reason: 400, message: "Unknown status code received: " + response.status};
  }
}

export async function Signup({ name, phone, email, pwd, tok_str }) {
  let response;
  let response_body;
  try {
    response = await fetch(paths.signup.signup, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({name, phone, email, pwd, tok_str })
    });
    let text = await response.text();
    if(text.length != 0) {
      response_body = JSON.parse(text);
    } else {
      response_body = {};
    }
  } catch(err) {
    console.error("Failed to send signup request:", err);
    return {authorized: false, reason: err};
  }

  switch(response.status) {
    case 201:
      return {authorized: true, reason: 201};
    case 400:
      return {authorized: false, reason: 400, message: response_body.error ?? "invalid request"};
    case 401:
      return {authorized: false, reason: 401};
    case 403:
      return {authorized: false, reason: 500, message: "signup forbidden" };
    default:
      return {authorized: false, reason: 400, message: "Unknown status code received: " + response.status};
  }
}

export async function Logout() {
  let response;
  let response_body;
  try {
    response = await fetch(paths.logout, {
      method: "POST",
    });
    let text = await response.text();
    if(text.length != 0) {
      response_body = JSON.parse(text);
    } else {
      response_body = {};
    }
  } catch(err) {
    console.error("Failed to send logout request:", err);
    return {reason: err};
  }

  switch(response.status) {
    case 200:
      return {reason: 200};
    case 400:
      return {reason: 500, message: "Logout 400"};
    case 500:
      return {reason: 500, message: "Server error: " + response_body.error ?? "internal error"};
    default:
      return {reason: 400, message: `Unknown status code received: ${response.status}`};
  }
}
