import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { DhikrList } from "@/components/dhikr/DhikrList";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

import { useNoorStore } from "@/store/noorStore";

export function CategoryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdhkarDB();
  const [sp] = useSearchParams();

  React.useEffect(() => {
    if (!id) return;
    useNoorStore.getState().setLastVisitedSectionId(id);
  }, [id]);

  const focusIndex = React.useMemo(() => {
    const raw = sp.get("focus");
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }, [sp]);

  React.useEffect(() => {
    // Reset section when navigating to a new section (as requested: "start fresh")
    // Use setTimeout to allow UI to unmount first if needed, or just run immediately.
    // However, we want to reset only when *entering*? Or leaving?
    // "restart the eact section when going to anoter secion"
    // Cleanest way: Clean up on unmount.
    return () => {
      // Reset on unmount (existing behavior)
      if (id) useNoorStore.getState().resetSection(id);
    };
  }, [id]);

  if (isLoading) return <div className="p-6 opacity-80">... تحميل</div>;
  if (!data || !id) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="font-semibold">القسم غير موجود</div>
        </Card>
      </div>
    );
  }

  const section = data.db.sections.find((s) => s.id === id);
  if (!section) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} />
            القسم غير موجود
          </div>
          <div className="mt-2 text-sm opacity-70">قد يكون المعرّف خاطئًا: {id}</div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => navigate("/")}>
              <Home size={16} />
              العودة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <DhikrList
      sectionId={section.id}
      title={section.title}
      items={section.content.map((i) => ({ ...i, count: i.count ?? 1 }))}
      focusIndex={focusIndex}
    />
  );
}
