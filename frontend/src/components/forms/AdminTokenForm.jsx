import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { CreateSignupToken } from "../../api/auth";

const validateEmail = (email) => /.+@.+\..+/.test(email);
const validateRequired = (v) =>
  v?.toString().trim().length ? null : "Required";

function validateContact(contact) {
  const isEmail = contact.includes("@"); //to check if input has @ to indicate email entered
  const isPhone = /^\d+$/.test(contact); //to check if string is made of only digits to indicate phone number

  if (isEmail) {
    const emailExpression = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailExpression.test(contact)
      ? { type: "email", value: contact }
      : null;
  } else if (isPhone) {
    return { type: "phone", value: contact };
  }
  return null;
}

export default function AdminTokenForm({ onTokenReady }) {
  const [form, setForm] = useState({
    name: "",
    surname: "",
    role: "",
    contact: "",
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [lastToken, setLastToken] = useState(null);

  //function to update specified property of form
  const set = (fieldName, newValue) =>
    setForm((currentData) => ({ ...currentData, [fieldName]: newValue }));

  const validate = () => {
    const e = {};
    e.name = validateRequired(form.name);
    e.surname = validateRequired(form.surname);
    e.role = validateRequired(form.role);
    const result = validateContact(form.contact);
    e.contact =
      validateRequired(form.contact) ||
      (result
        ? null
        : "Invalid contact information. Please add a valid email address or phone number.");
    Object.keys(e).forEach(
      (fieldName) => e[fieldName] === null && delete e[fieldName]
    );
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSending(true);

    try {
      //API call to get token
      const { token, reason, message } = await CreateSignupToken({
        email: form.contact.includes("@") ? form.contact : "",
        phone: /^\d+$/.test(form.contact) ? form.contact : "",
        role: form.role,
      });

      setSending(false);

      if (!token) {
        //If backend rejected token generation request
        setErrors({ contact: message || "Failed to generate token." });
        return;
      }

      setLastToken(token);
      onTokenReady?.(token, { ...form });
    } catch (err) {
      console.error("Error creating signup token: ", err);
      setSending(false);
      setErrors({ contact: "Server error, try again later." });
    }
  };

  return (
    <Card>
      <CardHeader
        title="Generate Registration Token"
        subtitle="Admins issue a one-time token. User receives link via email to open their registration form."
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
            <Field label="Role" htmlFor="adm_role" required error={errors.role}>
              <select
                id="adm_role"
                className="input"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              >
                <option value="">-- Select role --</option>
                <option value="pilot">Pilot</option>
                <option value="sysadmin">Administrator</option>
                <option value="atc">Air Traffic Controller</option>
              </select>
            </Field>
            <Field
              label="Contact number/Email address"
              htmlFor="adm_contact"
              required
              error={errors.contact}
            >
              <Input
                id="adm_contact"
                type="text"
                value={form.contact}
                onChange={(e) => set("contact", e.target.value)}
              />
            </Field>
          </div>

          <div className="row gap">
            <Button type="submit" disabled={sending}>
              {sending ? "Generating…" : "Generate token & send"}
            </Button>
            {lastToken ? (
              <span className="note">
                Token: <span className="mono">{lastToken}</span>
              </span>
            ) : null}
          </div>

          <p className="muted mt-1">
            Registration link with token sent to:{" "}
            <span className="mono">{form.contact}</span>.
          </p>
        </form>
      </CardBody>
    </Card>
  );
}
