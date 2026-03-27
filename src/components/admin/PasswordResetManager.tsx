import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Search, Clock, Key } from "lucide-react";

interface ResetRequest {
  id: string;
  user_id: string;
  identifier: string;
  phone: string;
  short_id: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  secure_token: string | null;
  username?: string;
}

const PasswordResetManager = () => {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch usernames for all requests
      const userIds = [...new Set((data || []).map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.username]));

      setRequests(
        (data || []).map((r) => ({
          ...r,
          username: profileMap.get(r.user_id) || r.identifier,
        }))
      );
    } catch {
      toast.error("Gagal memuat data reset password");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (request: ResetRequest, action: "approve" | "reject") => {
    setProcessing(request.id);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      const { error } = await supabase
        .from("password_reset_requests")
        .update({ status: newStatus, processed_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      if (action === "approve" && request.phone) {
        // Send reset link to user via WhatsApp through edge function
        const siteUrl = "https://realtime48show.my.id";
        const resetLink = `${siteUrl}/reset-password?token=${request.secure_token || request.short_id}`;
        
        try {
          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phone: request.phone,
              message: `🔑 *Reset Password Disetujui*\n\nKlik link berikut untuk membuat password baru:\n${resetLink}\n\n⏰ Link berlaku 2 jam.`,
            },
          });
        } catch {
          // WhatsApp send failed, but approval still succeeded
          toast.warning("Reset disetujui tapi gagal mengirim WhatsApp. Salin link manual.");
        }
      }

      toast.success(
        action === "approve"
          ? `Reset ${request.short_id} disetujui! Link dikirim ke user.`
          : `Reset ${request.short_id} ditolak.`
      );
      fetchRequests();
    } catch {
      toast.error("Gagal memproses permintaan");
    } finally {
      setProcessing(null);
    }
  };

  const copyResetLink = (request: ResetRequest) => {
    const siteUrl = "https://realtime48show.my.id";
    const link = `${siteUrl}/reset-password?token=${request.secure_token || request.short_id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link reset disalin!");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      case "expired": return <Badge variant="outline" className="bg-muted text-muted-foreground">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.identifier.toLowerCase().includes(q) ||
      r.short_id.toLowerCase().includes(q) ||
      (r.username || "").toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Manajemen Reset Password
        </h2>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari username, identifier, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Identifier</TableHead>
              <TableHead>HP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Tidak ada permintaan reset password
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.short_id}</TableCell>
                  <TableCell className="font-medium text-sm">{r.username || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.identifier}</TableCell>
                  <TableCell className="text-xs">{r.phone || "-"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAction(r, "approve")}
                            disabled={processing === r.id}
                            className="h-7 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(r, "reject")}
                            disabled={processing === r.id}
                            className="h-7 text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Tolak
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && r.secure_token && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyResetLink(r)}
                          className="h-7 text-xs"
                        >
                          Salin Link
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PasswordResetManager;
