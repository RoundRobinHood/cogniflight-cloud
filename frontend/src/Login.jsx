import { useCallback, useState } from "react";
import { Login as apiLogin } from "./api/auth";
import { useNavigate } from "react-router-dom";
import "./styles/forms.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const submitFn = useCallback(
    async (e) => {
      e.preventDefault();

      const newErrors = {};

      if (!email.trim()) newErrors.email = "Please enter email address.";
      if (!password.trim()) newErrors.password = "Please enter password.";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return; //doesn't allow submission if one of the fields are empty
      }
      setErrors({}); //clear previous errors

      try {
        const result = await apiLogin({ email, pwd: password });
        if (result.authorized) {
          navigate("/home");
        } else {
          setErrors({ form: "Invalid email or password." });
        }
      } catch (err) {
        setErrors({ form: "Server error. Please try again later." });
      }
    },
    [email, password]
  );

  return (
    <div className="page login-page">
      <div className="card login-card">
        <div className="card-header">
          <h4 className="card-title">Log in</h4>
        </div>
        <div className="card-body">
          <form className="grid gap-lg" onSubmit={submitFn}>
            <div className="field">
              <label className="label" htmlFor="email">
                Email<span className="req">*</span>
              </label>

              <input
                className="input"
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                name="email"
              />
              {errors.email && <p className="error">{errors.email}</p>}
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                Password<span className="req">*</span>{" "}
              </label>
              <input
                className="input"
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                name="password"
              />
              {errors.password && <p className="error">{errors.password}</p>}
            </div>
            {errors.form && <p className="error">{errors.form}</p>}
            <div className="row">
              <button className="btn btn-primary" type="submit">
                Log in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
