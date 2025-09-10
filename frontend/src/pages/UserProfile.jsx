import { useState, useEffect } from "react";
import { useLoaderData, useParams } from "react-router-dom";

//replace with real API call
async function fetchUserProfile(userId) {
  if (!userId) return null;

  //replace with backend call
  console.log("Fetching profile for user: ", userId);
  return {
    id: userId,
    role: "pilot",
    name: "John",
    surname: "Doe",
    email: "john@example.com",
    cellphone: "1234567890",
    licenseNo: "ABC123",
    height: 180,
    weight: 75,
  };
}

//replace with real API call
async function updateUserProfile(profile) {
  //PUT api logic
  console.log("Updating profile:", profile);
  return { success: true };
}

export default function UserProfile() {
  const authStatus = useLoaderData(); // Comes from WhoAmI loader in main.jsx
  const loggedInUser = authStatus.user;
  const { userId } = useParams(); //for admin editing
  const [targetUser, setTargetUser] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");

  //Load profile
  useEffect(() => {
    async function loadProfile() {
      // if admin is editing someone else
      if (userId) {
        if (loggedInUser.role !== "sysadmin") {
          // only admins allowed
          setMessage("You are not authorized to edit other users.");
          return;
        }
        const user = await fetchUserProfile(userId);
        setTargetUser(user);
        setForm(initForm(user));
      } else {
        // self-edit
        setTargetUser(loggedInUser);
        setForm(initForm(loggedInUser));
      }
    }
    loadProfile();
  }, [userId, loggedInUser]);

  // helper: prepare form based on role
  const initForm = (user) => {
    const baseForm = {
      name: user.name || "",
      surname: user.surname || "",
      email: user.email || "",
      cellphone: user.cellphone || "",
    };

    if (user.role === "pilot") {
      //pilot-only form fields
      return {
        ...baseForm,
        licenseNo: user.licenseNo || "",
        height: user.height || "",
        weight: user.weight || "",
        //more fields to be added, as is required for app to work.
      };
    }
    return baseForm;
  };

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    const result = await updateUserProfile(form);
    if (result.success) {
      setMessage("Profile updated successfully!");
    } else {
      setMessage("Failed to update profile.");
    }
  };

  //if not authorised
  if (message === "You are not authorised to edit other users.") {
    return <p style={{ color: "red" }}>{message}</p>;
  }

  if (!form) return <p>Loading...</p>;

  return (
    <div className="page container">
      <h2>Manage Profile</h2>
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
        {/*Pilot-only fields*/}

        {targetUser?.role === "pilot" && (
          <>
            <label>License No</label>
            <input
              value={form.licenseNo}
              onChange={(e) => set("licenseNo", e.target.value)}
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
          </>
        )}

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}
