import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import ActivityCalendar from "@/components/admin/ActivityCalendar";

export default function AdminPlanning() {
  const navigate = useNavigate();
  return (
    <AdminLayout title="Planning et réservations">
      <p className="text-sm text-muted-foreground mb-4">
        Visualisez les événements et ajoutez de nouveaux créneaux. Les tarifs et inclusions sont gérés dans la fiche activité.
      </p>
      <ActivityCalendar
        onEditActivity={() => navigate("/admin/activites")}
      />
    </AdminLayout>
  );
}
