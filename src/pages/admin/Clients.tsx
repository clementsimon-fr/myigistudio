import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { mockClients } from "@/data/mockData";

export default function AdminClients() {
  const [search, setSearch] = useState("");

  const filtered = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Clients">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <p className="text-sm text-muted-foreground self-center">{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Téléphone</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Crédits</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Réservations</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Inscrit depuis</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">
                  <Badge variant={c.credits === 0 ? "destructive" : "secondary"} className="text-xs">
                    {c.credits}
                  </Badge>
                </td>
                <td className="p-3">{c.totalReservations}</td>
                <td className="p-3">{new Date(c.joinedAt).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
