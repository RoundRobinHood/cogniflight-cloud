import { useCallback, useState} from "react"
import { Login as apiLogin } from "./api/auth"
import { useNavigate } from "react-router-dom"

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate();

  const submitFn = useCallback(async (e) => {
    e.preventDefault()

    const result = await apiLogin({email, pwd: password});
    if(result.authorized) {
      navigate("/home");
    }
  }, [email, password])

  return (
    <>
      <div style={{width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
        <div style={{border: "1px solid AccentColor", padding: "1rem 2rem"}}>
          <h4> Log in </h4>
          <hr/>
          <br/>

          <form style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem"}} onSubmit={submitFn}>
            <label htmlFor="email"> Email: </label>
            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} name="email"/>
            <label htmlFor="password"> Password: </label>
            <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} name="password"/>

            <input type="submit" value="Log in"/>
          </form>
        </div>
      </div>
    </>
  )
}

export default Login
