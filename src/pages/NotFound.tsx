import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="p-6">
      <Card className="p-6 text-center">
        <div className="text-5xl font-bold opacity-20">404</div>
        <div className="mt-3 text-lg font-semibold">الصفحة غير موجودة</div>
        <div className="mt-2 text-sm opacity-65 leading-7">ربما انتهى الرابط، أو تم نقل الصفحة.</div>
        <div className="mt-5">
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
