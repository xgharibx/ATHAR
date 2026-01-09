import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="p-6">
      <Card className="p-6">
        <div className="text-xl font-semibold">404</div>
        <div className="mt-2 opacity-70">الصفحة غير موجودة.</div>
        <div className="mt-4">
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
