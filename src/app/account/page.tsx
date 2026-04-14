"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { changePassword, getCurrentUser, updateName } from "./actions";

export default function AccountPage() {
  const t = useTranslations("Account");
  const { update: updateSession } = useSession();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nameOriginal, setNameOriginal] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getCurrentUser().then((result) => {
      if (result.success) {
        setUserId(result.data.id);
        setEmail(result.data.email ?? "");
        setName(result.data.name);
        setNameOriginal(result.data.name);
      }
      setLoading(false);
    });
  }, []);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSavingName(true);
    const result = await updateName({ name: name.trim() });
    if (result.success) {
      setNameOriginal(name.trim());
      await updateSession(); // refresh JWT so UserMenu picks up new name
      toast.success(t("nameUpdateSuccess"));
    } else {
      toast.error(t("nameUpdateError"), { description: result.message });
    }
    setSavingName(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return;
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    const result = await changePassword({ newPassword, confirmPassword });
    if (result.success) {
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("passwordUpdateSuccess"));
    } else {
      toast.error(t("passwordUpdateError"), { description: result.message });
    }
    setSavingPassword(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-48 h-4 rounded animate-pulse"
          style={{ background: "var(--gt-row-alt)" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="mx-auto" style={{ maxWidth: "480px" }}>
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mb-8 text-sm"
          style={{ color: "var(--gt-t3)" }}
        >
          <ArrowLeft size={14} />
          {t("backToHome")}
        </Link>

        {/* Avatar + Title */}
        <div className="flex items-center gap-4 mb-8">
          <HippyGhostAvatar seed={userId} className="size-12 rounded-full" />
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--gt-t1)", letterSpacing: "-0.025em" }}
            >
              {t("title")}
            </h1>
            <p className="text-sm" style={{ color: "var(--gt-t3)" }}>
              {t("description")}
            </p>
          </div>
        </div>

        {/* Email section */}
        <div
          className="p-6 mb-6"
          style={{
            background: "var(--gt-surface)",
            border: "1px solid var(--gt-border)",
            borderRadius: "0.375rem",
          }}
        >
          <label className="label-caps block mb-2">{t("emailLabel")}</label>
          <Input value={email} disabled className="bg-gray-50 cursor-not-allowed" />
          <p className="text-xs mt-2" style={{ color: "var(--gt-t4)" }}>
            {t("emailDescription")}
          </p>
        </div>

        {/* Username section */}
        <div
          className="p-6 mb-6"
          style={{
            background: "var(--gt-surface)",
            border: "1px solid var(--gt-border)",
            borderRadius: "0.375rem",
          }}
        >
          <label className="label-caps block mb-2">{t("nameLabel")}</label>
          <form onSubmit={handleUpdateName} className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              minLength={2}
              maxLength={64}
            />
            <p className="text-xs" style={{ color: "var(--gt-t4)" }}>
              {t("nameDescription")}
            </p>
            {name.trim() !== nameOriginal && (
              <button
                type="submit"
                disabled={savingName || name.trim().length < 2}
                className="btn-lab"
              >
                {savingName ? t("saving") : t("saveChanges")}
              </button>
            )}
          </form>
        </div>

        {/* Password section */}
        <div
          className="p-6"
          style={{
            background: "var(--gt-surface)",
            border: "1px solid var(--gt-border)",
            borderRadius: "0.375rem",
          }}
        >
          <label className="label-caps block mb-2">{t("passwordTitle")}</label>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--gt-t3)" }}>
                {t("newPasswordLabel")}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--gt-t3)" }}>
                {t("confirmPasswordLabel")}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--gt-t4)" }}>
              {t("passwordDescription")}
            </p>
            <button
              type="submit"
              disabled={savingPassword || newPassword.length < 8}
              className="btn-lab"
            >
              {savingPassword ? t("saving") : t("updatePassword")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
