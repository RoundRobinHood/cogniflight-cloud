import { useState } from "react";
import { useLoaderData, Navigate } from "react-router-dom";

//replace with real API call
async function updatePilotProfile(profile) {
  //PUT api logic
  console.log("Updating profile:", profile);
  return { success: true };
}

export default function PilotProfile() {
  const authStatus = useLoaderData(); // Comes from WhoAmI loader in main.jsx
  const pilot = authStatus.user;

  const [form, setForm] = useState({
    name: pilot.name || "",
    surname: pilot.surname || "",
    licenseNo: pilot.licenseNo || "",
    email: pilot.email || "",
    cellphone: pilot.cellphone || "",
    height: pilot.height || "",
    weight: pilot.weight || "",
    //more fields to be added, as is required for app to work.
  });

  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    const result = await updatePilotProfile(form);
    if (result.success) {
      setMessage("Profile updated successfully!");
    } else {
      setMessage("Failed to update profile.");
    }
  };

  return (
    <div className="page container">
      <h2>My Profile</h2>
      {message && <p style={{ color: "green" }}>{message}</p>}
      <form
        onSubmit={submit}
        className="grid gap-lg"
        style={{ maxWidth: "600px" }}
      >
        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />

        <label>Surname</label>
        <input
          value={form.surname}
          onChange={(e) => set("surname", e.target.value)}
          required
        />

        <label>License No</label>
        <input
          value={form.licenseNo}
          onChange={(e) => set("licenseNo", e.target.value)}
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />

        <label>Cellphone</label>
        <input
          type="tel"
          value={form.cellphone}
          onChange={(e) => set("cellphone", e.target.value)}
          required
        />

        <label>Height (cm)</label>
        <input
          type="number"
          value={form.height}
          onChange={(e) => set("height", e.target.value)}
          required
        />

        <label>Weight (kg)</label>
        <input
          type="number"
          value={form.weight}
          onChange={(e) => set("weight", e.target.value)}
          required
        />

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}
