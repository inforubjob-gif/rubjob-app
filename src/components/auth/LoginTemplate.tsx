"use client";

import { useState } from "react";
import GlobalInput from "@/components/ui/GlobalInput";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface LoginTemplateProps {
  portalName: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string;
  isLoading?: boolean;
  theme?: "primary" | "dark";
  mode?: "fullpage" | "modal";
  showForgotPassword?: boolean;
  showContactAdmin?: boolean;
  footerText?: string;
  emailLabel?: string;
  passwordLabel?: string;
  onForgotPassword?: (email: string) => Promise<void>;
}

import ConfirmModal from "@/components/ui/ConfirmModal";

export default function LoginTemplate({
  portalName,
  onSubmit,
  error,
  isLoading = false,
  theme = "primary",
  mode = "fullpage",
  showForgotPassword = true,
  showContactAdmin = true,
  footerText,
  emailLabel,
  passwordLabel,
  onForgotPassword,
}: LoginTemplateProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Forgot password form state
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    await onSubmit(email, password);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !onForgotPassword) return;
    setForgotLoading(true);
    setForgotError("");
    try {
      await onForgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setForgotLoading(false);
    }
  };

  const containerClasses = theme === "dark" 
    ? "bg-slate-900 text-white" 
    : "bg-gradient-to-b from-primary via-primary to-slate-50";

  return (
    <div className={`flex flex-col min-h-screen relative overflow-hidden ${containerClasses}`}>
      {/* Decorative Elements */}
      {theme === "primary" && (
        <>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 relative z-10 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/20">
            <Icons.Logo variant="icon-white" size={64} />
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-sm mb-1 uppercase">
            {portalName}
          </h1>
          <p className={`text-sm font-bold opacity-70 uppercase tracking-widest`}>
            {t("admin.login.authorizedOnly") || "Authorized Access Only"}
          </p>
        </div>

        {/* Login Card */}
        <div className={`bg-white rounded-3xl p-8 shadow-2xl shadow-black/10 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          {!showForgotForm ? (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <GlobalInput
                label={emailLabel || t("admin.login.emailLabel") || "Email"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                icon={<Icons.User size={20} />}
                required
                disabled={isLoading}
                className="text-slate-900"
              />

              <div className="space-y-1.5">
                <GlobalInput
                  label={passwordLabel || t("admin.login.passwordLabel") || "Password"}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Icons.Shield size={20} />}
                  required
                  disabled={isLoading}
                  className="text-slate-900"
                />
                {showForgotPassword && (
                  <div className="flex justify-end px-1">
                    <button 
                      type="button"
                      className="text-[11px] font-black text-primary hover:text-primary-heavy transition-colors"
                      onClick={() => {
                        if (onForgotPassword) {
                          setShowForgotForm(true);
                          setForgotEmail(email);
                          setForgotSuccess(false);
                          setForgotError("");
                        } else {
                          setShowAlert(true);
                        }
                      }}
                    >
                      {t("common.forgotPassword") || "Forgot Password?"}
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-3 animate-shake">
                  <div className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center shrink-0">
                    <Icons.Shield size={16} />
                  </div>
                  <p className="text-xs font-black text-rose-600 leading-tight">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                variant="primary"
                isLoading={isLoading}
                className="font-black uppercase tracking-wider h-14"
              >
                {t("admin.login.submitButton") || "Sign In"}
              </Button>
            </form>
          ) : (
            /* ─── Forgot Password Form ─── */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => { setShowForgotForm(false); setForgotSuccess(false); setForgotError(""); }}
                  className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-all"
                >
                  <Icons.Back size={16} className="text-slate-600" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">ลืมรหัสผ่าน</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forgot Password</p>
                </div>
              </div>

              {forgotSuccess ? (
                <div className="text-center py-4 animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icons.CheckCircle size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mb-1">ส่งลิงก์รีเซ็ตแล้ว! 📧</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่ทาง Email และ LINE (หากเชื่อมไว้)
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowForgotForm(false); setForgotSuccess(false); }}
                    className="text-xs font-black text-primary hover:text-primary-heavy"
                  >
                    ← กลับไปหน้าเข้าสู่ระบบ
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    กรอก Email ที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
                  </p>
                  
                  <GlobalInput
                    label="Email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    icon={<Icons.User size={20} />}
                    required
                    disabled={forgotLoading}
                    className="text-slate-900"
                  />

                  {forgotError && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                      <p className="text-xs font-black text-rose-600">{forgotError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    variant="primary"
                    isLoading={forgotLoading}
                    className="font-black uppercase tracking-wider h-14"
                  >
                    📧 ส่งลิงก์รีเซ็ตรหัสผ่าน
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-4">
          {showContactAdmin && (
            <button 
              type="button"
              className={`text-xs font-black flex items-center justify-center gap-2 mx-auto transition-opacity hover:opacity-80 ${theme === "dark" ? "text-white" : "text-white"}`}
              onClick={() => setShowAlert(true)}
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <Icons.Settings size={14} />
              </div>
              {t("common.contactAdmin") || "Contact Administrator"}
            </button>
          )}
          
          <div className="opacity-40 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4">
            <span className="h-[1px] w-8 bg-current" />
            {footerText || t("common.madeInBangkok") || "RUBJOB"}
            <span className="h-[1px] w-8 bg-current" />
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        onConfirm={() => setShowAlert(false)}
        title={t("common.forgotPassword") || "Forgot Password?"}
        description={t("common.forgotPasswordMessage")}
        confirmLabel={t("common.gotIt") || "OK"}
      />
    </div>
  );
}
