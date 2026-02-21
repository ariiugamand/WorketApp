import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Введите корректный email");
      return;
    }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?step=2`,
    });

    if (err) {
      setError("Ошибка отправки. Проверьте email и попробуйте снова.");
    } else {
      setSuccess("Ссылка для сброса пароля отправлена на ваш email. Проверьте почту.");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      setError("Пароль минимум 6 символов");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({ password: form.password });
    if (err) {
      setError("Ошибка обновления пароля: " + err.message);
    } else {
      setSuccess("Пароль успешно изменён!");
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  // Check if we're in reset mode (came from email link)
  const isRecoveryMode = window.location.hash.includes("type=recovery") || 
                          new URLSearchParams(window.location.search).get("step") === "2";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isRecoveryMode ? "Новый пароль" : "Сброс пароля"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Корпоративная система руководителя</p>
          </div>

          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert className="mb-4 border-success bg-success/10"><AlertDescription className="text-success">{success}</AlertDescription></Alert>}

          {isRecoveryMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Минимум 6 символов"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Повторите новый пароль"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить пароль"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Введите ваш email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !!success}>
                {loading ? "Отправка..." : "Отправить ссылку"}
              </Button>
            </form>
          )}

          <Link to="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-4 justify-center">
            <ArrowLeft className="w-4 h-4" /> Вернуться к входу
          </Link>
        </div>
      </div>
    </div>
  );
}
