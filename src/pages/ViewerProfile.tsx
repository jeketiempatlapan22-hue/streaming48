import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Coins, Key, LogOut, User, Mail, Clock, CheckCircle, XCircle, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ViewerProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [tokens, setTokens] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);

      const [profileRes, balRes, tokenRes, orderRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("coin_balances").select("balance").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("tokens").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("coin_orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      if (profileRes.data) { setProfile(profileRes.data); setNewUsername(profileRes.data.username || ""); }
      setBalance(balRes.data?.balance || 0);
      setTokens(tokenRes.data || []);
      setOrders(orderRes.data || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || !user) return;
    await supabase.from("profiles").update({ username: newUsername.trim() }).eq("id", user.id);
    setProfile({ ...profile, username: newUsername.trim() });
    setEditingUsername(false);
    toast.success("Username diperbarui!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyToken = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/live?t=${code}`);
    toast.success("Link disalin!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold">Real<span className="text-primary">Time48</span></span>
          </a>
          <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition active:scale-[0.95]">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {editingUsername ? (
                <div className="flex items-center gap-2">
                  <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateUsername()} autoFocus />
                  <button onClick={handleUpdateUsername} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium active:scale-[0.95]">Simpan</button>
                  <button onClick={() => setEditingUsername(false)} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium">Batal</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold truncate">{profile?.username || "User"}</h2>
                  <button onClick={() => setEditingUsername(true)} className="text-xs text-primary hover:underline">Edit</button>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {user?.email}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--warning))]/10 px-4 py-2.5">
              <Coins className="h-5 w-5 text-[hsl(var(--warning))]" />
              <div className="text-right">
                <p className="text-lg font-bold text-[hsl(var(--warning))]">{balance}</p>
                <p className="text-[10px] text-muted-foreground">Koin</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <a href="/coins" className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--warning))]/10 px-4 py-2 text-sm font-medium text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/20 transition active:scale-[0.95]">
              <Coins className="h-4 w-4" /> Beli Koin
            </a>
            <a href="/schedule" className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition active:scale-[0.95]">
              <Key className="h-4 w-4" /> Jadwal Show
            </a>
          </div>
        </motion.div>

        {/* Tokens */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> Token Akses Saya
          </h3>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada token. Beli tiket show untuk mendapatkan token.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => {
                const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
                const isBlocked = t.status === "blocked";
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-semibold text-foreground truncate">{t.code}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                          isBlocked ? "bg-destructive/20 text-destructive"
                            : isExpired ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                            : "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                        }`}>
                          {isBlocked ? "BLOCKED" : isExpired ? "EXPIRED" : "ACTIVE"}
                        </span>
                        {t.expires_at && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(t.expires_at).toLocaleDateString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isBlocked && !isExpired && (
                      <button onClick={() => copyToken(t.code)} className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition active:scale-[0.95]">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Orders */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Coins className="h-4 w-4 text-[hsl(var(--warning))]" /> Riwayat Pembelian Koin
          </h3>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada pembelian koin.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{o.coin_amount} Koin</p>
                      <span className={`flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                        o.status === "pending" ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                          : o.status === "confirmed" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                          : "bg-destructive/20 text-destructive"
                      }`}>
                        {o.status === "pending" ? <Clock className="h-2.5 w-2.5" /> : o.status === "confirmed" ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                        {o.status === "pending" ? "Menunggu" : o.status === "confirmed" ? "Dikonfirmasi" : "Ditolak"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/" className="text-primary hover:underline">← Kembali ke beranda</a>
        </p>
      </div>
    </div>
  );
};

export default ViewerProfile;
