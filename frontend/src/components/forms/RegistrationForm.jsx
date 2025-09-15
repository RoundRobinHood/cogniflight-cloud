import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input, Divider } from "../ui/Input";
import PasswordInput from "../ui/PasswordInput";

const validateEmail = (email) => /.+@.+\..+/.test(email);
const validateRequired = (v) =>
  v?.toString().trim().length ? null : "Required";

export default function RegistrationForm({ seed = {}, onComplete }) {
  const [form, setForm] = useState({
    name: seed.name,
    surname: seed.surname,
    licenseNo: seed.licenseNo,
    email: seed.email,
    cellphone: "",
    height: "",
    weight: "",
    username: "",
    password: "",
    confirm: "",
    //add more fields, as is required for app to work.
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pwStrength = useMemo(() => {
    const v = form.password;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[a-z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score; // 0..5
  }, [form.password]);

  const strengthLabel =
    ["Too weak", "Weak", "Fair", "Good", "Strong", "Very strong"][pwStrength] ||
    "";

  const validate = () => {
    const e = {};
    e.username = validateRequired(form.username);
    e.password = validateRequired(form.password);
    if (!e.password && pwStrength < 3)
      e.password = "Use at least 8 chars incl. upper/lowercase & number";
    e.confirm =
      form.confirm === form.password ? null : "Passwords do not match";

    e.cellphone = validateRequired(form.cellphone);
    e.height = validateRequired(form.height);
    e.weight = validateRequired(form.weight);

    // Pre-populated fields: keep editable but require non-empty
    e.name = validateRequired(form.name);
    e.surname = validateRequired(form.surname);
    e.licenseNo = validateRequired(form.licenseNo);
    e.email =
      validateRequired(form.email) ||
      (validateEmail(form.email) ? null : "Invalid email");

    Object.keys(e).forEach((k) => e[k] === null && delete e[k]);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onComplete?.({ ...form });

    //maps form fields to api's expected field names.
    const dataToSend = {
      name: form.name,
      surname: form.surname,
      email: form.email,
      phone: form.cellphone,
      pwd: form.password,
    };
    onComplete?.(dataToSend);
  };

  return (
    <Card>
      <CardHeader
        title="Pilot Registration"
        subtitle="Confirm your details and create your login credentials."
        icon={"🧑‍✈️"}
      />
      <CardBody>
        <form onSubmit={submit} className="grid gap-lg">
          <div className="grid two-col gap">
            <Field label="Name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field
              label="Surname"
              htmlFor="surname"
              required
              error={errors.surname}
            >
              <Input
                id="surname"
                value={form.surname}
                onChange={(e) => set("surname", e.target.value)}
              />
            </Field>
            <Field
              label="License Number"
              htmlFor="licenseNo"
              required
              error={errors.licenseNo}
            >
              <Input
                id="licenseNo"
                value={form.licenseNo}
                onChange={(e) => set("licenseNo", e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field
              label="Cellphone"
              htmlFor="cell"
              required
              error={errors.cellphone}
            >
              <Input
                id="cell"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 0821234567"
                value={form.cellphone}
                onChange={(e) => set("cellphone", e.target.value)}
              />
            </Field>
            <Field
              label="Height (cm)"
              htmlFor="height"
              required
              error={errors.height}
            >
              <Input
                id="height"
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 172"
                value={form.height}
                onChange={(e) => set("height", e.target.value)}
              />
            </Field>
            <Field
              label="Weight (kg)"
              htmlFor="weight"
              required
              error={errors.weight}
            >
              <Input
                id="weight"
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 68"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
              />
            </Field>
          </div>

          <Divider />

          <div className="grid two-col gap">
            <Field
              label="Username"
              htmlFor="username"
              required
              error={errors.username}
            >
              <Input
                id="username"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                autoComplete="username"
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              required
              error={errors.password}
              hint={strengthLabel}
            >
              <PasswordInput
                id="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </Field>
            <Field
              label="Confirm Password"
              htmlFor="confirm"
              required
              error={errors.confirm}
            >
              <PasswordInput
                id="confirm"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                placeholder="Repeat your password"
              />
            </Field>
          </div>

          <div className="row gap">
            <Button type="submit">Create account</Button>
            <span className="small muted">
              By continuing you agree to our terms and privacy policy.
            </span>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
