import * as React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Info, Star, Share2, MessageCircle, FileText } from "lucide-react";
import { openStoreListing } from "@/lib/storeIdentity";
import { shareText } from "@/lib/shareTargets";
import { openInApp } from "@/lib/inAppBrowser";
import { APP_VERSION } from "@/lib/appVersion";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsUI";

export function AboutGroup() {
  const navigate = useNavigate();
  return (
    <>
      <SettingsSection>
        <SettingsRow id="version" icon={<Info size={17} />} title="الإصدار" value={<span dir="ltr">{APP_VERSION}</span>} />
      </SettingsSection>
      <SettingsSection title="ساهم في انتشار الخير">
        <SettingsRow
          id="rate"
          icon={<Star size={17} />}
          title="قيّم أثر"
          hint="تقييمك يساعد غيرك على الوصول إليه"
          onClick={() => void openStoreListing()}
        />
        <SettingsRow
          id="share-app"
          icon={<Share2 size={17} />}
          title="شارك أثر"
          hint="الدالّ على الخير كفاعله"
          onClick={async () => {
            const result = await shareText("أنصحك بتطبيق أثر للأذكار والقرآن ومواقيت الصلاة.", "أثر");
            if (result === "downloaded") toast.success("نُسخ رابط التطبيق");
          }}
        />
      </SettingsSection>
      <SettingsSection>
        <SettingsRow
          id="contact"
          icon={<MessageCircle size={17} />}
          title="تواصل معنا"
          hint="اقتراح، أو مشكلة واجهتك"
          onClick={() => navigate("/feedback")}
        />
        <SettingsRow
          id="terms"
          icon={<FileText size={17} />}
          title="شروط الاستخدام"
          onClick={() => void openInApp("https://www.athark.org/terms.html")}
        />
      </SettingsSection>
      <p className="text-center text-[11px] text-(--muted)">© {new Date().getFullYear()} أثر</p>
    </>
  );
}
