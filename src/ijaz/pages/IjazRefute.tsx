
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import LogicTree from '@/ijaz/components/ui/LogicTree';

export default function RefutePage() {
  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="font-amiri text-4xl md:text-5xl font-bold mb-4 gold-gradient-text">
            دحض الشبهات
          </h1>
          <p className="text-text-secondary font-tajawal text-base mb-2">Refute Athiesm Sandbox</p>
          <p className="text-text-secondary font-tajawal text-sm max-w-3xl mx-auto">
            شجرة تفاعلية من البراهين المنطقية على وجود الله تعالى، مستخرجة من كتاب
            <span className="text-gold-primary font-bold"> بصائر </span>
            للدكتور هيثم طلعت — اضغط على كل عنصر لاستكشاف البرهان والردود
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="glass-card p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gold-primary/15 flex items-center justify-center text-2xl flex-shrink-0">
                📖
              </div>
              <div>
                <h2 className="text-gold-primary font-amiri text-xl font-bold mb-2">
                  البرهان القرآني
                </h2>
                <p className="text-text-secondary font-tajawal text-sm leading-relaxed">
                  يقول الله تعالى في سورة الطور (الآيات 35-36):
                </p>
              </div>
            </div>

            <div className="relative p-6 rounded-xl bg-vanta/50 border border-verse-green/10 mb-6">
              <p className="font-amiri text-verse-green text-xl md:text-2xl leading-relaxed text-center" dir="rtl">
                أَمْ خُلِقُوا مِنْ غَيْرِ شَيْءٍ أَمْ هُمُ الْخَالِقُونَ ۝ أَمْ خَلَقُوا السَّمَاوَاتِ وَالْأَرْضَ ۚ بَل لَّا يُوقِنُونَ
              </p>
              <p className="text-text-secondary text-sm font-tajawal text-center mt-3 italic" dir="ltr">
                &ldquo;Or were they created by nothing, or were they the creators [of themselves]?
                Or did they create the heavens and the earth? Rather, they are not certain.&rdquo;
              </p>
              <p className="text-text-muted text-xs font-tajawal text-center mt-2">
                سورة الطور : 35-36
              </p>
            </div>

            <p className="text-text-secondary font-tajawal text-sm leading-relaxed">
              هذه الآية العظيمة تُقدم حجة منطقية محكمة: الكون إما جاء من العدم (مستحيل)، أو خلق نفسه (تناقض منطقي)، 
              أو أنه أزلي (يناقض العلم). الخيار الوحيد المعقول: أن الله هو الخالق.
              <br />
              <br />
              <span className="text-gold-primary font-bold">اضغط على العناصر أدناه لاستكشاف كل حجة ودحضها:</span>
            </p>
          </div>
        </motion.div>

        {/* Logic Tree */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-16"
        >
          <LogicTree />
        </motion.div>

        {/* Additional Arguments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-gold-primary font-amiri text-2xl font-bold mb-8 text-center">
            براهين إضافية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: '🎯',
                titleAr: 'برهان الضبط الدقيق',
                title: 'Fine-Tuning Argument',
                descriptionAr: 'الثوابت الفيزيائية للكون مضبوطة بدقة متناهية لا يمكن أن تكون صدفة — دليل على المدبر الحكيم',
                color: '#9b59b6',
                slug: 'fine-tuning',
              },
              {
                icon: '🧩',
                titleAr: 'برهان الإمكان والوجوب',
                title: 'Contingency Argument',
                descriptionAr: 'كل شيء ممكن الوجود يحتاج سبباً — لا بد من واجب الوجود الغني عن كل سبب',
                color: '#4A90D9',
                slug: 'contingency-argument',
              },
              {
                icon: '⚖️',
                titleAr: 'البرهان الأخلاقي',
                title: 'Moral Argument',
                descriptionAr: 'القيم الأخلاقية الموضوعية لا يمكن تفسيرها بدون مشرّع متعالٍ — الله',
                color: '#2dd4a8',
                slug: 'moral-argument',
              },
              {
                icon: '💭',
                titleAr: 'مشكلة الوعي',
                title: 'Consciousness Problem',
                descriptionAr: 'الوعي والعقل لا يمكن اختزالهما في مادة — دليل على البعد غير المادي والخالق',
                color: '#e67e22',
                slug: 'consciousness-argument',
              },
            ].map((arg) => (
              <Link key={arg.slug} to={`/ijaz/miracles/${arg.slug}`}>
                <div className="glass-card p-6 hover:scale-[1.02] transition-all h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${arg.color}15` }}
                    >
                      {arg.icon}
                    </div>
                    <div>
                      <h3 className="font-amiri text-lg font-bold mb-1" style={{ color: arg.color }}>
                        {arg.titleAr}
                      </h3>
                      <p className="text-text-muted text-xs font-tajawal mb-2">{arg.title}</p>
                      <p className="text-text-secondary text-sm font-tajawal leading-relaxed">
                        {arg.descriptionAr}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            to="/ijaz/miracles"
            className="gold-button px-8 py-3 font-tajawal font-bold inline-flex items-center gap-2"
          >
            استكشف جميع المعجزات
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rotate-180">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
