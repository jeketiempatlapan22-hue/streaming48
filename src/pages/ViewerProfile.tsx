import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Coins, Save, User, History, BarChart3, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ViewerProfile = () => {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      const u = session.user;
      setUser(u);
      const [profileRes, balRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", u.id).maybeSingle(),
        supabase.from("coin_balances").select("balance").eq("user_id", u.id).maybeSingle(),
        supabase.from("coin_orders").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(20),
      ]);
      const name = profileRes.data?.username || u.user_metadata?.username || "";
      setUsername(name); setOriginalUsername(name);
      setBalance(balRes.data?.balance || 0);
      setOrders(ordersRes.data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, username: username.trim() }, { onConflict: "id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else { setOriginalUsername(username.trim()); toast.success("Username diperbarui!"); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center animate-pulse"><Shield className="h-6 w-6 text-primary" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button><span className="text-sm font-bold text-foreground">Profil Saya</span></div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--warning))]/10 px-3 py-1.5"><Coins className="h-4 w-4 text-[hsl(var(--warning))]" /><span className="text-sm font-bold text-[hsl(var(--warning))]">{balance}</span></div>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex flex-col items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><User className="h-8 w-8 text-primary" /></div><p className="text-xs text-muted-foreground">{user?.email || ""}</p></div>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" className="bg-background" maxLength={30} />
            <Button className="w-full gap-2" disabled={username.trim() === originalUsername || saving || !username.trim()} onClick={handleSave}><Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Username"}</Button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Statistik</h3></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background p-3 text-center"><p className="text-lg font-bold text-[hsl(var(--warning))]">{balance}</p><p className="text-[10px] text-muted-foreground">Saldo Koin</p></div>
            <div className="rounded-lg bg-background p-3 text-center"><p className="text-lg font-bold text-primary">{orders.length}</p><p className="text-[10px] text-muted-foreground">Total Order</p></div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Saldo Koin</p><div className="flex items-center gap-2 mt-1"><Coins className="h-5 w-5 text-[hsl(var(--warning))]" /><span className="text-2xl font-bold text-[hsl(var(--warning))]">{balance}</span></div></div><Button size="sm" variant="outline" onClick={() => navigate("/coins")}><Coins className="mr-1.5 h-3.5 w-3.5" /> Beli Koin</Button></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Riwayat Order</h3></div>
          {orders.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Belum ada order</p> : (
            <div className="space-y-2">
              {orders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground">{o.coin_amount} Koin</p><p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p></div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${o.status === "confirmed" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : o.status === "pending" ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" : "bg-destructive/10 text-destructive"}`}>{o.status === "confirmed" ? "Dikonfirmasi" : o.status === "pending" ? "Menunggu" : o.status}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ViewerProfile;
