import { FormEvent, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);
    try {
      await api.patch("/auth/me", { full_name: fullName });
      await refreshUser();
      setProfileMessage("Saved.");
    } catch (err: any) {
      setProfileError(err?.response?.data?.detail || "Couldn't save your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setIsSavingPassword(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated.");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.detail || "Couldn't update your password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-medium">Settings</h1>

      <section className="mt-8">
        <p className="page-eyebrow">profile</p>
        <form onSubmit={handleProfileSubmit} className="mt-3 flex flex-col gap-4">
          <div>
            <label className="field-label">Email</label>
            <input type="email" value={user?.email || ""} disabled className="field-input opacity-60" />
          </div>
          <div>
            <label className="field-label">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field-input"
              placeholder="Your name"
            />
          </div>
          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          {profileMessage && <p className="text-sm text-accent-700">{profileMessage}</p>}
          <button type="submit" disabled={isSavingProfile} className="btn-primary w-fit">
            {isSavingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <p className="page-eyebrow">password</p>
        <form onSubmit={handlePasswordSubmit} className="mt-3 flex flex-col gap-4">
          <div>
            <label className="field-label">Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="field-input"
              placeholder="At least 8 characters"
            />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-accent-700">{passwordMessage}</p>}
          <button type="submit" disabled={isSavingPassword} className="btn-primary w-fit">
            {isSavingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}