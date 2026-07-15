import AdminLayout from "@/components/admin/AdminLayout";
import ImportWizard from "@/components/admin/ImportWizard";

export default function AdminImport() {
  return (
    <AdminLayout title="Import de données">
      <p className="text-sm text-muted-foreground mb-6">
        Importez l'historique clients, réservations ou cartes récupéré depuis Calendly, SimplyBook ou tout autre export CSV.
      </p>
      <ImportWizard />
    </AdminLayout>
  );
}
