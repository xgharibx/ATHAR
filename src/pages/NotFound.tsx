import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { House, Search, ArrowRight } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="p-8 text-center max-w-sm w-full relative overflow-hidden">
        {/* Decorative glow */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, var(--accent), transparent)" }}
          aria-hidden="true"
        />

        <div className="relative">
          {/* Arabic "404" */}
          <div className="text-8xl font-black opacity-10 leading-none select-none tabular-nums">
            ٤٠٤
          </div>

          <div className="mt-4 text-4xl">🔍</div>

          <div className="mt-4 text-xl font-bold">الصفحة غير موجودة</div>
          <div className="mt-2 text-sm opacity-65 leading-7">
            ربما انتهى الرابط، أو تم نقل الصفحة إلى مكان آخر.
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link to="/">
              <Button className="w-full justify-center">
                <House size={16} />
                العودة للرئيسية
              </Button>
            </Link>
            <Button variant="secondary" className="w-full justify-center" onClick={() => navigate("/search")}>
              <Search size={16} />
              البحث في الأذكار
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate(-1)}>
              <ArrowRight size={16} />
              الصفحة السابقة
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
