
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogicNode } from '@/ijaz/types';

// Logic tree data from "بصائر" (Basaar) book
const logicNodes: LogicNode[] = [
  {
    id: 'root',
    claim: 'Does God exist?',
    claimAr: 'هل الله موجود؟',
    type: 'atheist-claim',
    content: 'This is the foundational question that the book "بصائر" addresses through rigorous logical argumentation.',
    contentAr: 'هذا السؤال الأساسي الذي يتناوله كتاب "بصائر" من خلال الحجج المنطقية الصارمة.',
    children: ['atheist-nothing', 'atheist-self', 'atheist-eternal'],
    source: 'بصائر - د. هيثم طلعت',
  },
  {
    id: 'atheist-nothing',
    claim: '"The universe came from nothing"',
    claimAr: '"الكون جاء من العدم"',
    type: 'atheist-claim',
    content: 'Some atheists claim the universe could pop into existence from absolute nothing without a cause.',
    contentAr: 'يدّعي بعض الملاحدة أن الكون يمكن أن ينبثق من العدم المطلق بلا سبب.',
    children: ['refute-nothing'],
    parentId: 'root',
    source: 'بصائر',
  },
  {
    id: 'refute-nothing',
    claim: 'REFUTED: Nothing cannot produce something',
    claimAr: 'مدحوض: العدم لا يُنتج شيئاً',
    type: 'refutation',
    content: 'Absolute nothing has no properties, no potential, no laws. It cannot "do" anything. From nothing, nothing comes (ex nihilo nihil fit). This is a foundational principle of logic and science. Quran (52:35): "Or were they created by nothing?"',
    contentAr: 'العدم المطلق لا خصائص له ولا قدرة ولا قوانين. لا يمكنه "فعل" أي شيء. من العدم لا يأتي شيء. هذا مبدأ أساسي في المنطق والعلم. القرآن (52:35): "أَمْ خُلِقُوا مِنْ غَيْرِ شَيْءٍ"',
    children: ['evidence-nothing'],
    parentId: 'atheist-nothing',
    source: 'بصائر',
  },
  {
    id: 'evidence-nothing',
    claim: 'Evidence: Causality is fundamental',
    claimAr: 'الدليل: السببية أساسية',
    type: 'evidence',
    content: 'The principle of sufficient reason states everything must have an explanation. All of science is built on causality. Claiming something came from nothing is not science—it is superstition.',
    contentAr: 'مبدأ العلة الكافية يقرر أن كل شيء لا بد له من تفسير. كل العلم مبني على السببية. القول بأن شيئاً جاء من العدم ليس علماً — إنه خرافة.',
    children: [],
    parentId: 'refute-nothing',
    source: 'بصائر',
  },
  {
    id: 'atheist-self',
    claim: '"The universe created itself"',
    claimAr: '"الكون خلق نفسه"',
    type: 'atheist-claim',
    content: 'Some claim the universe brought itself into existence through quantum fluctuations or self-causation.',
    contentAr: 'يدّعي البعض أن الكون أوجد نفسه من خلال التقلبات الكمومية أو السببية الذاتية.',
    children: ['refute-self'],
    parentId: 'root',
    source: 'بصائر',
  },
  {
    id: 'refute-self',
    claim: 'REFUTED: Logical impossibility',
    claimAr: 'مدحوض: استحالة منطقية',
    type: 'refutation',
    content: 'For the universe to create itself, it would need to exist before it existed—a logical contradiction. Something cannot be both cause and effect of itself simultaneously. This violates the law of non-contradiction. Quran (52:35): "Or were they the creators [of themselves]?"',
    contentAr: 'لكي يخلق الكون نفسه، يجب أن يكون موجوداً قبل أن يوجد — وهذا تناقض منطقي. الشيء لا يمكن أن يكون سبباً ومسبَّباً لنفسه في آن واحد. هذا ينتهك قانون عدم التناقض. القرآن (52:35): "أَمْ هُمُ الْخَالِقُونَ"',
    children: ['evidence-self'],
    parentId: 'atheist-self',
    source: 'بصائر',
  },
  {
    id: 'evidence-self',
    claim: 'Evidence: Law of Non-Contradiction',
    claimAr: 'الدليل: قانون عدم التناقض',
    type: 'evidence',
    content: 'The law of non-contradiction is the most fundamental law of logic. Something cannot both exist and not exist at the same time and in the same respect. Self-creation violates this foundational principle.',
    contentAr: 'قانون عدم التناقض هو أكثر قوانين المنطق أساسيةً. الشيء لا يمكن أن يوجد ولا يوجد في نفس الوقت ومن نفس الجهة. الخلق الذاتي ينتهك هذا المبدأ الأساسي.',
    children: [],
    parentId: 'refute-self',
    source: 'بصائر',
  },
  {
    id: 'atheist-eternal',
    claim: '"The universe is eternal"',
    claimAr: '"الكون أزلي"',
    type: 'atheist-claim',
    content: 'Some claim the universe has always existed and therefore needs no creator.',
    contentAr: 'يدّعي البعض أن الكون كان موجوداً دائماً وبالتالي لا يحتاج خالقاً.',
    children: ['refute-eternal'],
    parentId: 'root',
    source: 'بصائر',
  },
  {
    id: 'refute-eternal',
    claim: 'REFUTED: Science proves a beginning',
    claimAr: 'مدحوض: العلم يثبت البداية',
    type: 'refutation',
    content: 'Multiple independent lines of evidence prove the universe began: (1) The Big Bang, (2) Second Law of Thermodynamics (heat death hasn\'t occurred), (3) Borde-Guth-Vilenkin theorem (any expanding universe must have had a beginning), (4) Impossibility of actual infinites.',
    contentAr: 'خطوط متعددة مستقلة من الأدلة تثبت أن الكون بدأ: (1) الانفجار العظيم، (2) القانون الثاني للديناميكا الحرارية (لم يحدث الموت الحراري)، (3) نظرية بورد-غوث-فيلنكين، (4) استحالة اللانهائيات الفعلية.',
    children: ['conclusion'],
    parentId: 'atheist-eternal',
    source: 'بصائر',
  },
  {
    id: 'conclusion',
    claim: 'CONCLUSION: A Transcendent Creator must exist',
    claimAr: 'الخلاصة: لا بد من وجود خالق متعالٍ',
    type: 'conclusion',
    content: 'Since the universe (1) didn\'t come from nothing, (2) didn\'t create itself, and (3) isn\'t eternal—it MUST have been created by a transcendent cause that is: timeless, spaceless, immaterial, immensely powerful, and personal (possessing will). This matches the Quranic description of Allah.',
    contentAr: 'بما أن الكون (1) لم يأتِ من العدم، (2) ولم يخلق نفسه، (3) وليس أزلياً — فلا بد أن يكون قد خُلق بسبب متعالٍ: خارج الزمان والمكان، غير مادي، ذو قدرة عظيمة، وذو إرادة. وهذا يتطابق مع وصف القرآن لله تعالى.',
    children: [],
    parentId: 'refute-eternal',
    source: 'بصائر',
  },
];

function getNodeColor(type: LogicNode['type']): { bg: string; border: string; text: string; glow: string } {
  switch (type) {
    case 'atheist-claim':
      return {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.3)',
        text: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.2)',
      };
    case 'refutation':
      return {
        bg: 'rgba(45, 212, 168, 0.1)',
        border: 'rgba(45, 212, 168, 0.3)',
        text: '#2dd4a8',
        glow: 'rgba(45, 212, 168, 0.2)',
      };
    case 'evidence':
      return {
        bg: 'rgba(74, 144, 217, 0.1)',
        border: 'rgba(74, 144, 217, 0.3)',
        text: '#4A90D9',
        glow: 'rgba(74, 144, 217, 0.2)',
      };
    case 'conclusion':
      return {
        bg: 'rgba(212, 168, 83, 0.1)',
        border: 'rgba(212, 168, 83, 0.3)',
        text: '#d4a853',
        glow: 'rgba(212, 168, 83, 0.3)',
      };
    default:
      return {
        bg: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#ffffff',
        glow: 'rgba(255, 255, 255, 0.1)',
      };
  }
}

function LogicNodeCard({ node, depth = 0 }: { node: LogicNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const colors = getNodeColor(node.type);
  const children = logicNodes.filter((n) => node.children.includes(n.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: depth > 0 ? -20 : 0 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: depth * 0.1 }}
      className={`${depth > 0 ? 'mr-6 sm:mr-10' : ''}`}
    >
      {/* Connection Line */}
      {depth > 0 && (
        <div className="absolute right-0 top-0 w-6 sm:w-10 h-px" style={{ background: colors.border }} />
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-right group"
      >
        <div
          className="relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01]"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            boxShadow: isExpanded ? `0 0 30px ${colors.glow}` : 'none',
          }}
        >
          {/* Type Label */}
          <div className="flex items-center justify-between mb-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-tajawal font-semibold"
              style={{ background: `${colors.text}20`, color: colors.text }}
            >
              {node.type === 'atheist-claim' && '🔴 ادّعاء إلحادي'}
              {node.type === 'refutation' && '✅ دحض'}
              {node.type === 'evidence' && '📚 دليل'}
              {node.type === 'conclusion' && '⭐ خلاصة'}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.text}
              strokeWidth="2"
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {/* Claim */}
          <h3 className="font-amiri text-lg font-bold mb-1" style={{ color: colors.text }}>
            {node.claimAr}
          </h3>
          <p className="text-text-secondary text-sm font-tajawal">{node.claim}</p>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                  <p className="text-text-primary text-sm font-tajawal leading-relaxed">
                    {node.contentAr}
                  </p>
                  <p className="text-text-muted text-xs font-tajawal leading-relaxed mt-2 italic" dir="ltr">
                    {node.content}
                  </p>
                  <p className="text-text-muted text-xs font-tajawal mt-3">
                    المصدر: {node.source}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div className="relative mt-4 space-y-4">
          {children.map((child) => (
            <LogicNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function LogicTree() {
  const rootNode = logicNodes.find((n) => n.id === 'root');

  if (!rootNode) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-gold-primary font-amiri text-2xl md:text-3xl font-bold mb-2">
          شجرة البراهين المنطقية
        </h2>
        <p className="text-text-secondary font-tajawal text-sm">
          من كتاب «بصائر» — د. هيثم طلعت | اضغط على كل عنصر لاستكشاف البرهان
        </p>
      </div>

      {/* Tree */}
      <LogicNodeCard node={rootNode} />
    </div>
  );
}
