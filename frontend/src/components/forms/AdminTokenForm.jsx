import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";

const randomToken = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const validateEmail = (email) => /.+@.+\..+/.test(email);
const validateRequired = (v) =>
  v?.toString().trim().length ? null : "Required";

export default function AdminTokenForm({ onTokenReady }) {
  const [form, setForm] = useState({
    name: "",
    surname: "",
    licenseNo: "",
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [lastToken, setLastToken] = useState(null);

  //function to update specified property of form
  const set = (fieldName, newValue) => setForm((currentData) => ({ ...currentData, [fieldName]: newValue }));

  const validate = () => {
    const e = {};
    e.name = validateRequired(form.name);
    e.surname = validateRequired(form.surname);
    e.licenseNo = validateRequired(form.licenseNo);
    e.email =
      validateRequired(form.email) ||
      (validateEmail(form.email) ? null : "Invalid email");
    Object.keys(e).forEach((fieldName) => e[fieldName] === null && delete e[fieldName]);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSending(true);

    const token = randomToken();

    setTimeout(() => {
      setSending(false);
      setLastToken(token);
      onTokenReady?.(token, { ...form });
    }, 500);
  };

  return (
    <Card>
      <CardHeader
        title="Generate Pilot Token"
        subtitle="Admins issue a one-time token. The pilot receives link via email to open their registration form."
        icon={"🔐"}
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="grid gap">
          <div className="grid two-col gap">
            <Field label="Name" htmlFor="adm_name" required error={errors.name}>
              <Input
                id="adm_name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field
              label="Surname"
              htmlFor="adm_surname"
              required
              error={errors.surname}
            >
              <Input
                id="adm_surname"
                value={form.surname}
                onChange={(e) => set("surname", e.target.value)}
              />
            </Field>
            <Field
              label="License Number"
              htmlFor="adm_license"
              required
              error={errors.licenseNo}
              hint="Pilot licence number"
            >
              <Input
                id="adm_license"
                value={form.licenseNo}
                onChange={(e) => set("licenseNo", e.target.value)}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="adm_email"
              required
              error={errors.email}
            >
              <Input
                id="adm_email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
          </div>

          <div className="row gap">
            <Button type="submit" disabled={sending}>
              {sending ? "Generating…" : "Generate token & email"}
            </Button>
            {lastToken ? (
              <span className="note">
                (Demo) Token: <span className="mono">{lastToken}</span>
              </span>
            ) : null}
          </div>

          <p className="muted mt-1">
            In production, the registration link will be emailed to the pilot. Here we show
            token for demo/testing.
          </p>
        </form>
      </CardBody>
    </Card>
  );
}
