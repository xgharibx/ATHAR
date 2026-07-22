
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ScrollReveal, TextReveal } from '@/ijaz/components/effects/ScrollAnimations';
import { AnimatedGradientText, CinematicTypewriter } from '@/ijaz/components/effects/TextEffects';

/* Dynamic imports — no SSR */
import SacredGeometry from '@/ijaz/components/effects/SacredGeometry';

/* ================================================================
   JOURNEY DATA
   ================================================================ */
interface JourneyStep {
  id: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  questionAr: string;
  contentAr: string;
  verseAr?: string;
  verseSurah?: string;
  evidenceAr: string[];
  linkSlug?: string;
  linkLabel?: string;
  bgVariant: 'cosmic' | 'divine' | 'deep' | 'golden';
  particleVariant: 'stars' | 'gold-dust' | 'divine-light' | 'nebula' | 'geometric';
}

export const journeySteps: JourneyStep[] = [
  {
    id: 1,
    titleAr: '\u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0623\u0648\u0644',
    titleEn: 'The First Question',
    icon: '\u{1F914}',
    gradientFrom: '#e74c3c',
    gradientTo: '#c0392b',
    questionAr: '\u0647\u0644 \u064A\u0645\u0643\u0646 \u0623\u0646 \u064A\u0648\u062C\u062F \u0634\u064A\u0621 \u0645\u0646 \u0644\u0627 \u0634\u064A\u0621\u061F',
    contentAr: '\u0643\u0644 \u0634\u064A\u0621 \u062D\u0648\u0644\u0643 \u0644\u0647 \u0633\u0628\u0628. \u0627\u0644\u0643\u0631\u0633\u064A \u0627\u0644\u0630\u064A \u062A\u062C\u0644\u0633 \u0639\u0644\u064A\u0647\u060C \u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0630\u064A \u062A\u0642\u0631\u0623 \u0645\u0646\u0647\u060C \u0627\u0644\u0647\u0648\u0627\u0621 \u0627\u0644\u0630\u064A \u062A\u062A\u0646\u0641\u0633\u0647 \u2014 \u0643\u0644\u0647 \u0644\u0647 \u0635\u0627\u0646\u0639. \u0641\u0645\u0627 \u0628\u0627\u0644\u0643 \u0628\u0627\u0644\u0643\u0648\u0646 \u0628\u0623\u0643\u0645\u0644\u0647\u061F\n\n\u0627\u0644\u0639\u0644\u0645 \u064A\u0642\u0648\u0644: \u0627\u0644\u0643\u0648\u0646 \u0644\u0647 \u0628\u062F\u0627\u064A\u0629 (\u0627\u0644\u0627\u0646\u0641\u062C\u0627\u0631 \u0627\u0644\u0639\u0638\u064A\u0645 \u2014 13.8 \u0645\u0644\u064A\u0627\u0631 \u0633\u0646\u0629). \u0645\u0627 \u0628\u062F\u0623 \u0644\u0627 \u0628\u062F \u0623\u0646 \u0628\u062F\u0623\u0647 \u0634\u064A\u0621. \u0648\u0645\u0627 \u0628\u062F\u0623\u0647 \u0644\u0627 \u0628\u062F \u0623\u0646 \u064A\u0643\u0648\u0646 \u062E\u0627\u0631\u062C \u0627\u0644\u0632\u0645\u0627\u0646 \u0648\u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0645\u0627\u062F\u0629 \u2014 \u0623\u064A \u0625\u0644\u0647.',
    verseAr: '\u0623\u064E\u0645\u0652 \u062E\u064F\u0644\u0650\u0642\u064F\u0648\u0627 \u0645\u0650\u0646\u0652 \u063A\u064E\u064A\u0652\u0631\u0650 \u0634\u064E\u064A\u0652\u0621\u064D \u0623\u064E\u0645\u0652 \u0647\u064F\u0645\u064F \u0627\u0644\u0652\u062E\u064E\u0627\u0644\u0650\u0642\u064F\u0648\u0646\u064E',
    verseSurah: '\u0627\u0644\u0637\u0648\u0631 : 35',
    evidenceAr: [
      '\u062F\u0644\u064A\u0644 \u0627\u0644\u0643\u0644\u0627\u0645 \u0627\u0644\u0643\u0648\u0646\u064A: \u0643\u0644 \u0645\u0627 \u0628\u062F\u0623 \u0644\u0647 \u0633\u0628\u0628\u060C \u0627\u0644\u0643\u0648\u0646 \u0628\u062F\u0623\u060C \u0625\u0630\u0646 \u0644\u0644\u0643\u0648\u0646 \u0633\u0628\u0628',
      '\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062F\u064A\u0646\u0627\u0645\u064A\u0643\u0627 \u0627\u0644\u062D\u0631\u0627\u0631\u064A\u0629 \u0627\u0644\u062B\u0627\u0646\u064A \u064A\u062B\u0628\u062A \u0623\u0646 \u0627\u0644\u0643\u0648\u0646 \u0644\u064A\u0633 \u0623\u0632\u0644\u064A\u064B\u0627',
      '\u0646\u0638\u0631\u064A\u0629 \u0628\u0648\u0631\u062F-\u0641\u064A\u0644\u0646\u0643\u064A\u0646-\u062C\u0648\u062B \u0623\u062B\u0628\u062A\u062A \u0627\u0633\u062A\u062D\u0627\u0644\u0629 \u0627\u0644\u0643\u0648\u0646 \u0627\u0644\u0623\u0632\u0644\u064A',
    ],
    linkSlug: 'big-bang',
    linkLabel: '\u0627\u0642\u0631\u0623 \u0639\u0646 \u0627\u0644\u0627\u0646\u0641\u062C\u0627\u0631 \u0627\u0644\u0639\u0638\u064A\u0645',
    bgVariant: 'cosmic',
    particleVariant: 'stars',
  },
  {
    id: 2,
    titleAr: '\u0627\u0644\u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u062F\u0642\u064A\u0642',
    titleEn: 'The Fine-Tuning',
    icon: '\u{1F3AF}',
    gradientFrom: '#d4a853',
    gradientTo: '#f0d68a',
    questionAr: '\u0644\u0645\u0627\u0630\u0627 \u0627\u0644\u0643\u0648\u0646 \u0645\u0636\u0628\u0648\u0637 \u0628\u062F\u0642\u0629 \u0645\u0630\u0647\u0644\u0629\u061F',
    contentAr: '\u0627\u0644\u062B\u0648\u0627\u0628\u062A \u0627\u0644\u0643\u0648\u0646\u064A\u0629 \u0645\u0636\u0628\u0648\u0637\u0629 \u0628\u062F\u0642\u0629 \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0635\u0648\u0631\u0647\u0627. \u0644\u0648 \u062A\u063A\u064A\u0631\u062A \u0642\u0648\u0629 \u0627\u0644\u062C\u0627\u0630\u0628\u064A\u0629 \u0628\u0645\u0642\u062F\u0627\u0631 1 \u0645\u0646 10^40 \u0644\u0645\u0627 \u0648\u062C\u062F\u062A \u0646\u062C\u0648\u0645 \u0648\u0644\u0627 \u062D\u064A\u0627\u0629. \u0644\u0648 \u062A\u063A\u064A\u0631\u062A \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0646\u0648\u0648\u064A\u0629 \u0628\u0645\u0642\u062F\u0627\u0631 2% \u0644\u0645\u0627 \u062A\u0643\u0648\u0646\u062A \u0630\u0631\u0627\u062A.\n\n\u0647\u0630\u0627 \u0644\u064A\u0633 \u062D\u0638\u064B\u0627 \u2014 \u0647\u0630\u0627 \u062A\u0635\u0645\u064A\u0645. \u0648\u0627\u0644\u062A\u0635\u0645\u064A\u0645 \u064A\u0633\u062A\u0644\u0632\u0645 \u0645\u0635\u0645\u0645\u064B\u0627. \u062D\u062A\u0649 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0648\u0646 \u0627\u0644\u0645\u0644\u062D\u062F\u0648\u0646 \u064A\u0639\u062A\u0631\u0641\u0648\u0646 \u0628\u0647\u0630\u0627: \u0641\u0631\u064A\u062F \u0647\u0648\u064A\u0644 \u0642\u0627\u0644 \u201C\u0627\u0644\u062A\u0641\u0633\u064A\u0631 \u0627\u0644\u0639\u0642\u0644\u0627\u0646\u064A \u064A\u0642\u062A\u0631\u062D \u0639\u0642\u0644\u064B\u0627 \u0641\u0627\u0626\u0642\u064B\u0627\u201D.',
    verseAr: '\u0625\u0650\u0646\u0651\u064E\u0627 \u0643\u064F\u0644\u0651\u064E \u0634\u064E\u064A\u0652\u0621\u064D \u062E\u064E\u0644\u064E\u0642\u0652\u0646\u064E\u0627\u0647\u064F \u0628\u0650\u0642\u064E\u062F\u064E\u0631\u064D',
    verseSurah: '\u0627\u0644\u0642\u0645\u0631 : 49',
    evidenceAr: [
      '\u062B\u0627\u0628\u062A \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u062F\u0642\u064A\u0642\u0629 (\u03B1 = 1/137) \u0645\u0636\u0628\u0648\u0637 \u0628\u062F\u0642\u0629 10^-40',
      '\u062B\u0627\u0628\u062A \u0628\u0648\u0644\u062A\u0632\u0645\u0627\u0646 10^-123 \u0645\u0636\u0628\u0648\u0637 \u0628\u062F\u0642\u0629 \u0645\u0630\u0647\u0644\u0629',
      '\u0641\u0631\u064A\u062F \u0647\u0648\u064A\u0644 \u0648\u0631\u0648\u062C\u0631 \u0628\u0646\u0631\u0648\u0632 \u0627\u0639\u062A\u0631\u0641\u0627 \u0628\u062F\u0644\u064A\u0644 \u0627\u0644\u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u062F\u0642\u064A\u0642',
    ],
    linkSlug: 'fine-tuning',
    linkLabel: '\u0627\u0642\u0631\u0623 \u0639\u0646 \u0627\u0644\u0636\u0628\u0637 \u0627\u0644\u062F\u0642\u064A\u0642',
    bgVariant: 'golden',
    particleVariant: 'gold-dust',
  },
  {
    id: 7,
    titleAr: 'أصل الحياة',
    titleEn: 'The Origin of Life',
    icon: '🧬',
    gradientFrom: '#06b6d4',
    gradientTo: '#0284c7',
    questionAr: 'كيف نشأت الحياة من مادة جامدة؟',
    contentAr: `DNA يحمل معلومات أكثر من أي مكتبة بشرية. مكتشف DNA فرانسيس كريك قال: "احتمال نشوء الحياة عشوائيًا على الأرض ضئيل للغاية لدرجة تجعله شبه مستحيل".

كمية المعلومات في الجين الواحد = 10^40,000 بت. احتمال تشكّل بروتين واحد عشوائيًا: 1/10^164. وعدد الذرات في الكون: 10^80.

الانفجار الكمبري: ظهور مفاجئ لـ 50 شعبة حيوانية دون أسلاف — معضلة يعترف بها المتخصصون.

الحياة لا تنشأ من المادة وحدها — هي تحتاج معلومة مُبرمَجة. والمعلومة تصدر دائمًا عن عقل.`,
    verseAr: 'وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ',
    verseSurah: 'الأنبياء : 30',
    evidenceAr: [
      'DNA يحمل 3.2 مليار "حرف" من المعلومات — أكثر من موسوعة بريتانيكا بألف مرة',
      'احتمال تشكّل بروتين واحد عشوائيًا: 1/10^164 — أصغر من حدود الاحتمال الكوني',
      'الانفجار الكمبري: 50 شعبة حيوانية ظهرت فجأة دون أسلاف تطورية معروفة',
    ],
    linkSlug: 'origin-of-life-argument',
    linkLabel: 'اقرأ عن أصل الحياة',
    bgVariant: 'deep',
    particleVariant: 'nebula',
  },
  {
    id: 3,
    titleAr: '\u0627\u0644\u0642\u0631\u0622\u0646 \u064A\u062A\u062D\u062F\u0649',
    titleEn: 'The Quran Challenges',
    icon: '\u{1F4D6}',
    gradientFrom: '#2dd4a8',
    gradientTo: '#10b981',
    questionAr: '\u0625\u0630\u0627 \u0643\u0627\u0646 \u0647\u0646\u0627\u0643 \u0625\u0644\u0647\u060C \u0641\u0643\u064A\u0641 \u0646\u0639\u0631\u0641 \u0623\u064A \u0631\u0633\u0627\u0644\u0629 \u0645\u0646\u0647\u061F',
    contentAr: '\u0625\u0630\u0627 \u0623\u0631\u0633\u0644 \u0627\u0644\u0644\u0647 \u0631\u0633\u0627\u0644\u0629\u060C \u0641\u0644\u0627 \u0628\u062F \u0623\u0646 \u062A\u062D\u0645\u0644 \u0628\u0635\u0645\u062A\u0647 \u2014 \u0634\u064A\u0626\u064B\u0627 \u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0628\u0634\u0631 \u0645\u062D\u0627\u0643\u0627\u062A\u0647. \u0627\u0644\u0642\u0631\u0622\u0646 \u0641\u0639\u0644 \u0647\u0630\u0627 \u0628\u0637\u0631\u064A\u0642\u0629 \u0641\u0631\u064A\u062F\u0629: \u0644\u0645 \u064A\u0643\u062A\u0641\u0650 \u0628\u0623\u0646 \u064A\u062F\u0651\u0639\u064A \u2014 \u0628\u0644 \u062A\u062D\u062F\u0651\u0649.\n\n\u062A\u062D\u062F\u0649 \u0643\u0644 \u0627\u0644\u0628\u0634\u0631 \u0648\u0627\u0644\u062C\u0646 \u0623\u0646 \u064A\u0623\u062A\u0648\u0627 \u0628\u0645\u062B\u0644\u0647. \u0648\u0645\u0631\u062A 1400 \u0633\u0646\u0629 \u2014 \u0648\u0644\u0645 \u064A\u0633\u062A\u0637\u0639 \u0623\u062D\u062F. \u0644\u0643\u0646 \u0627\u0644\u0623\u0639\u062C\u0628: \u0627\u0644\u0642\u0631\u0622\u0646 \u0644\u0645 \u064A\u0643\u062A\u0641\u0650 \u0628\u0627\u0644\u062A\u062D\u062F\u064A \u0627\u0644\u0644\u063A\u0648\u064A \u2014 \u0628\u0644 \u062A\u0636\u0645\u0646 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0639\u0644\u0645\u064A\u0629 \u0644\u0645 \u062A\u064F\u0643\u062A\u0634\u0641 \u0625\u0644\u0627 \u0628\u0639\u062F \u0642\u0631\u0648\u0646.',
    verseAr: '\u0642\u064F\u0644 \u0644\u0651\u064E\u0626\u0650\u0646\u0650 \u0627\u062C\u0652\u062A\u064E\u0645\u064E\u0639\u064E\u062A\u0650 \u0627\u0644\u0652\u0625\u0650\u0646\u0633\u064F \u0648\u064E\u0627\u0644\u0652\u062C\u0650\u0646\u0651\u064F \u0639\u064E\u0644\u064E\u0649\u0670 \u0623\u064E\u0646 \u064A\u064E\u0623\u0652\u062A\u064F\u0648\u0627 \u0628\u0650\u0645\u0650\u062B\u0652\u0644\u0650 \u0647\u064E\u0670\u0630\u064E\u0627 \u0627\u0644\u0652\u0642\u064F\u0631\u0652\u0622\u0646\u0650 \u0644\u064E\u0627 \u064A\u064E\u0623\u0652\u062A\u064F\u0648\u0646\u064E \u0628\u0650\u0645\u0650\u062B\u0652\u0644\u0650\u0647\u0650',
    verseSurah: '\u0627\u0644\u0625\u0633\u0631\u0627\u0621 : 88',
    evidenceAr: [
      '\u062A\u062D\u062F\u064A \u0645\u0641\u062A\u0648\u062D \u0645\u0646\u0630 1400 \u0633\u0646\u0629 \u0648\u0644\u0645 \u064A\u0646\u062C\u062D \u0623\u062D\u062F',
      '\u0627\u0644\u0642\u0631\u0622\u0646 \u062A\u062D\u062F\u0649 \u062A\u062F\u0631\u064A\u062C\u064A\u064B\u0627: \u0645\u062B\u0644\u0647 \u2192 10 \u0633\u0648\u0631 \u2192 \u0633\u0648\u0631\u0629 \u0648\u0627\u062D\u062F\u0629',
      '\u0639\u062C\u0632 \u0623\u0628\u0644\u063A \u0639\u0631\u0628 \u0627\u0644\u0641\u0635\u0627\u062D\u0629 \u0627\u0644\u0630\u064A\u0646 \u062D\u0627\u0631\u0628\u0648\u0627 \u0644\u0643\u0646\u0647\u0645 \u0644\u0645 \u064A\u0633\u062A\u0637\u064A\u0639\u0648\u0627 \u0627\u0644\u062A\u0642\u0644\u064A\u062F',
    ],
    linkSlug: 'quran-inimitability-challenge',
    linkLabel: 'اقرأ عن تحدي القرآن',
    bgVariant: 'divine',
    particleVariant: 'divine-light',
  },
  {
    id: 4,
    titleAr: '\u0627\u0644\u062F\u0644\u064A\u0644 \u0627\u0644\u0633\u0627\u062D\u0642',
    titleEn: 'The Crushing Evidence',
    icon: '\u{1F52C}',
    gradientFrom: '#4A90D9',
    gradientTo: '#2563eb',
    questionAr: '\u0645\u0627 \u0627\u0644\u062F\u0644\u064A\u0644 \u0639\u0644\u0649 \u0623\u0646 \u0627\u0644\u0642\u0631\u0622\u0646 \u0645\u0646 \u0627\u0644\u0644\u0647\u061F',
    contentAr: '\u0647\u0646\u0627 \u062A\u0628\u062F\u0623 \u0627\u0644\u0631\u062D\u0644\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629. \u062A\u062E\u064A\u0644 \u0631\u062C\u0644\u064B\u0627 \u0623\u064F\u0645\u0651\u064A\u064B\u0627 \u0641\u064A \u0635\u062D\u0631\u0627\u0621 \u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0641\u064A \u0627\u0644\u0642\u0631\u0646 \u0627\u0644\u0633\u0627\u0628\u0639:\n\n\u2022 \u0648\u0635\u0641 \u062A\u0648\u0633\u0639 \u0627\u0644\u0643\u0648\u0646 \u0628\u062F\u0642\u0629 (\u0627\u0643\u062A\u064F\u0634\u0641 1929)\n\u2022 \u0648\u0635\u0641 \u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062C\u0646\u064A\u0646 \u0628\u062F\u0642\u0629 (\u0627\u0643\u062A\u064F\u0634\u0641 1974)\n\u2022 \u0648\u0635\u0641 \u062C\u0630\u0648\u0631 \u0627\u0644\u062C\u0628\u0627\u0644 \u0643\u0627\u0644\u0623\u0648\u062A\u0627\u062F (\u0627\u0643\u062A\u064F\u0634\u0641 1906)\n\u2022 \u0648\u0635\u0641 \u0638\u0644\u0645\u0627\u062A \u0623\u0639\u0645\u0627\u0642 \u0627\u0644\u0628\u062D\u0631 (\u0627\u0643\u062A\u064F\u0634\u0641 1960)\n\u2022 \u0648\u0635\u0641 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0646\u0627\u0635\u064A\u0629 \u0641\u064A \u0627\u0644\u062F\u0645\u0627\u063A (\u0627\u0643\u062A\u064F\u0634\u0641 2000)\n\n50+ معجزة علمية. ولا خطأ واحد. \u0627\u062D\u062A\u0645\u0627\u0644 \u0627\u0644\u0635\u062F\u0641\u0629: 1/10^50.',
    verseAr: '\u0633\u064E\u0646\u064F\u0631\u0650\u064A\u0647\u0650\u0645\u0652 \u0622\u064A\u064E\u0627\u062A\u0650\u0646\u064E\u0627 \u0641\u0650\u064A \u0627\u0644\u0652\u0622\u0641\u064E\u0627\u0642\u0650 \u0648\u064E\u0641\u0650\u064A \u0623\u064E\u0646\u0641\u064F\u0633\u0650\u0647\u0650\u0645\u0652',
    verseSurah: '\u0641\u0635\u0644\u062A : 53',
    evidenceAr: [
      '50+ معجزة علمية موثقة في الكونيات والأحياء والأرض',
      '\u0643\u0644 \u0645\u0639\u062C\u0632\u0629 \u0633\u0628\u0642\u062A \u0627\u0644\u0639\u0644\u0645 \u0628\u0645\u0626\u0627\u062A \u0627\u0644\u0633\u0646\u064A\u0646',
      '\u0644\u0627 \u064A\u0648\u062C\u062F \u062E\u0637\u0623 \u0639\u0644\u0645\u064A \u0648\u0627\u062D\u062F \u0641\u064A \u0643\u0644 \u0627\u0644\u0642\u0631\u0622\u0646',
    ],
    linkSlug: 'universe-expansion',
    linkLabel: '\u0627\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u0645\u0639\u062C\u0632\u0627\u062A',
    bgVariant: 'deep',
    particleVariant: 'nebula',
  },
  {
    id: 5,
    titleAr: '\u0627\u0644\u0646\u0628\u0648\u0621\u0627\u062A',
    titleEn: 'The Prophecies',
    icon: '\u{1F52E}',
    gradientFrom: '#8b5cf6',
    gradientTo: '#6366f1',
    questionAr: '\u0647\u0644 \u064A\u0645\u0643\u0646 \u0644\u0623\u062D\u062F \u0623\u0646 \u064A\u062A\u0646\u0628\u0623 \u0628\u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644\u061F',
    contentAr: '\u0627\u0644\u0642\u0631\u0622\u0646 \u0641\u0639\u0644\u0647\u0627. \u0648\u0644\u064A\u0633 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629.\n\n\u062A\u0646\u0628\u0623 \u0628\u0627\u0646\u062A\u0635\u0627\u0631 \u0627\u0644\u0631\u0648\u0645 \u0641\u064A \u0623\u0642\u0644 \u0645\u0646 9 \u0633\u0646\u0648\u0627\u062A \u2014 \u0648\u062D\u062F\u062B. \u062A\u0646\u0628\u0623 \u0628\u062D\u0641\u0638 \u062C\u0633\u062F \u0641\u0631\u0639\u0648\u0646 \u2014 \u0648\u0647\u0627 \u0647\u0648 \u0641\u064A \u0627\u0644\u0645\u062A\u062D\u0641. \u062A\u0646\u0628\u0623 \u0628\u0641\u062A\u062D \u0627\u0644\u0642\u0633\u0637\u0646\u0637\u064A\u0646\u064A\u0629 \u2014 \u0648\u0641\u064F\u062A\u062D\u062A 1453. \u062A\u0646\u0628\u0623 \u0628\u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0633\u0627\u0639\u0629 \u0645\u0646 \u0643\u062B\u0631\u0629 \u0627\u0644\u0632\u0644\u0627\u0632\u0644 \u0625\u0644\u0649 \u062A\u0637\u0627\u0648\u0644 \u0627\u0644\u0631\u0639\u0627\u0629 \u0641\u064A \u0627\u0644\u0628\u0646\u064A\u0627\u0646.\n\n\u0643\u0644 \u0646\u0628\u0648\u0621\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 \u062A\u062A\u062D\u0642\u0642 \u062A\u064F\u0636\u0639\u0641 \u0627\u062D\u062A\u0645\u0627\u0644 \u0627\u0644\u0635\u062F\u0642 \u0623\u0636\u0639\u0627\u0641\u064B\u0627 \u0645\u0636\u0627\u0639\u0641\u0629.',
    verseAr: '\u063A\u064F\u0644\u0650\u0628\u064E\u062A\u0650 \u0627\u0644\u0631\u0651\u064F\u0648\u0645\u064F \u0641\u0650\u064A \u0623\u064E\u062F\u0652\u0646\u064E\u0649 \u0627\u0644\u0652\u0623\u064E\u0631\u0652\u0636\u0650 \u0648\u064E\u0647\u064F\u0645 \u0645\u0651\u0650\u0646 \u0628\u064E\u0639\u0652\u062F\u0650 \u063A\u064E\u0644\u064E\u0628\u0650\u0647\u0650\u0645\u0652 \u0633\u064E\u064A\u064E\u063A\u0652\u0644\u0650\u0628\u064F\u0648\u0646\u064E',
    verseSurah: '\u0627\u0644\u0631\u0648\u0645 : 2-3',
    evidenceAr: [
      '\u0646\u0628\u0648\u0621\u0629 \u0627\u0646\u062A\u0635\u0627\u0631 \u0627\u0644\u0631\u0648\u0645 \u062A\u062D\u0642\u0642\u062A \u0628\u0627\u0644\u062D\u0631\u0641',
      '\u062C\u0633\u062F \u0641\u0631\u0639\u0648\u0646 \u0645\u062D\u0641\u0648\u0638 \u0641\u064A \u0627\u0644\u0645\u062A\u062D\u0641 \u0627\u0644\u0645\u0635\u0631\u064A \u0643\u0645\u0627 \u0623\u062E\u0628\u0631 \u0627\u0644\u0642\u0631\u0622\u0646',
      '\u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0633\u0627\u0639\u0629 \u062A\u062A\u062D\u0642\u0642 \u0648\u0627\u062D\u062F\u0629 \u062A\u0644\u0648 \u0627\u0644\u0623\u062E\u0631\u0649',
    ],
    linkSlug: 'romans-victory-prophecy',
    linkLabel: '\u0627\u0642\u0631\u0623 \u0639\u0646 \u0627\u0644\u0646\u0628\u0648\u0621\u0627\u062A',
    bgVariant: 'cosmic',
    particleVariant: 'geometric',
  },
  {
    id: 8,
    titleAr: 'البشارات في الكتب السماوية',
    titleEn: 'Biblical Prophecies',
    icon: '📜',
    gradientFrom: '#e879f9',
    gradientTo: '#a855f7',
    questionAr: 'هل يُذكر محمد ﷺ في الكتاب المقدس؟',
    contentAr: `الإجابة: نعم. وليس مرة واحدة.

• التثنية 18:18: "أقيم لهم نبيًا من إخوتهم مثلك" — الإخوة هم أبناء إسماعيل، ومثل موسى يعني نبيًا أمّيًا جاء بشريعة كاملة.
• نشيد الأناشيد 5:16: كلمة "محمداً" موجودة حرفيًا في النص العبري الأصلي.
• إشعياء 42: "عبدي الذي أنصره" — وصف مطابق للنبي ﷺ وبلاد العرب.
• يوحنا 16:7: "الباراكليت" الذي يعلّم كل شيء = البارقليطا = أحمد ﷺ.`,
    verseAr: 'الَّذِينَ يَتَّبِعُونَ الرَّسُولَ النَّبِيَّ الْأُمِّيَّ الَّذِي يَجِدُونَهُ مَكْتُوبًا عِندَهُمْ فِي التَّوْرَاةِ وَالْإِنجِيلِ',
    verseSurah: 'الأعراف : 157',
    evidenceAr: [
      'التثنية 18:18 — "من إخوتهم" تشير لبني إسماعيل، ولم تتحقق في أي نبي آخر',
      'نشيد الأناشيد 5:16 — كلمة "محمداً" موجودة حرفيًا في النص العبري الأصلي',
      'يوحنا 16:7 — "الباراكليت" لا ينطبق على الروح القدس بل على نبي بشري',
    ],
    linkSlug: 'prophecy-in-torah',
    linkLabel: 'اقرأ عن البشارات في الكتب السماوية',
    bgVariant: 'divine',
    particleVariant: 'divine-light',
  },
  {
    id: 6,
    titleAr: '\u0627\u0644\u062E\u064F\u0644\u0627\u0635\u0629',
    titleEn: 'The Conclusion',
    icon: '\u{1F31F}',
    gradientFrom: '#d4a853',
    gradientTo: '#f0d68a',
    questionAr: '\u0645\u0627\u0630\u0627 \u064A\u0639\u0646\u064A \u0643\u0644 \u0647\u0630\u0627\u061F',
    contentAr: '\u0644\u0642\u062F \u0631\u0623\u064A\u062A \u0627\u0644\u0622\u0646:\n\n1. \u0627\u0644\u0643\u0648\u0646 \u0644\u0647 \u062E\u0627\u0644\u0642 (\u062F\u0644\u064A\u0644 \u0627\u0644\u0642\u064E\u0644\u0627\u0645 \u0627\u0644\u0643\u0648\u0646\u064A)\n2. \u0627\u0644\u062E\u0627\u0644\u0642 \u0630\u0643\u064A \u0648\u0639\u0627\u0644\u0650\u0645 (\u062F\u0644\u064A\u0644 \u0627\u0644\u0636\u0628\u0637 \u0627\u0644\u062F\u0642\u064A\u0642)\n3. \u0645\u062D\u0645\u062F \uFDFA \u0644\u0645 \u064A\u0643\u0646 \u064A\u0645\u0644\u0643 \u0647\u0630\u0627 \u0627\u0644\u0639\u0644\u0645 (\u0623\u064F\u0645\u0651\u064A \u0641\u064A \u0627\u0644\u0635\u062D\u0631\u0627\u0621)\n4. \u0627\u0644\u0642\u0631\u0622\u0646 \u064A\u062D\u0645\u0644 \u0639\u0644\u0645\u064B\u0627 \u0644\u0645 \u064A\u0643\u0646 \u0645\u0645\u0643\u0646\u064B\u0627 (50+ معجزة)\n5. النبوءات تحققت (إخبار بالغيب)\n6. البشارات مكتوبة في الكتب السابقة\n\n\u0627\u0644\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u0645\u0646\u0637\u0642\u064A\u0629 \u0627\u0644\u0648\u062D\u064A\u062F\u0629: \u0647\u0630\u0627 \u0627\u0644\u0643\u062A\u0627\u0628 \u0645\u0646 \u0639\u0646\u062F \u0627\u0644\u0644\u0647\u060C \u0648\u0645\u062D\u0645\u062F \uFDFA \u0631\u0633\u0648\u0644\u0647.\n\n\u0648\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0642\u0631\u0622\u0646 \u0645\u0646 \u0627\u0644\u0644\u0647 \u2014 \u0641\u0627\u0644\u0625\u0633\u0644\u0627\u0645 \u062D\u0642.',
    verseAr: '\u0648\u064E\u0645\u064E\u0627 \u0623\u064E\u0631\u0652\u0633\u064E\u0644\u0652\u0646\u064E\u0627\u0643\u064E \u0625\u0650\u0644\u0651\u064E\u0627 \u0631\u064E\u062D\u0652\u0645\u064E\u0629\u064B \u0644\u0651\u0650\u0644\u0652\u0639\u064E\u0627\u0644\u064E\u0645\u0650\u064A\u0646\u064E',
    verseSurah: '\u0627\u0644\u0623\u0646\u0628\u064A\u0627\u0621 : 107',
    evidenceAr: [
      '\u0627\u0644\u0645\u0646\u0637\u0642 \u064A\u0642\u0648\u0644: \u0643\u062A\u0627\u0628 \u064A\u062D\u0645\u0644 \u0639\u0644\u0645 \u0627\u0644\u062E\u0627\u0644\u0642 = \u0645\u0646 \u0627\u0644\u062E\u0627\u0644\u0642',
      '\u0644\u0627 \u062A\u0641\u0633\u064A\u0631 \u0628\u062F\u064A\u0644 \u0645\u0639\u0642\u0648\u0644 \u0644\u0645\u0635\u062F\u0631 \u0647\u0630\u0627 \u0627\u0644\u0639\u0644\u0645',
      '1400 \u0633\u0646\u0629 \u0645\u0646 \u0627\u0644\u062A\u062D\u062F\u064A \u0627\u0644\u0645\u0641\u062A\u0648\u062D \u0628\u062F\u0648\u0646 \u0625\u062C\u0627\u0628\u0629',
    ],
    bgVariant: 'golden',
    particleVariant: 'gold-dust',
  },
];

/* ================================================================
   JOURNEY PAGE — CINEMATIC FULL-SCREEN EXPERIENCE
   ================================================================ */
export default function JourneyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [unlockedSteps, setUnlockedSteps] = useState([0]);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= journeySteps.length) return;
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
      if (!unlockedSteps.includes(index)) {
        setUnlockedSteps((prev) => [...prev, index]);
      }
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [currentStep, unlockedSteps]
  );

  const step = journeySteps[currentStep];
  const progress = ((currentStep + 1) / journeySteps.length) * 100;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617]" dir="rtl">
      {/* ===== BACKGROUND: Pure CSS stars per step (replaces WebGL for mobile performance) ===== */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.bgVariant + step.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 dhikr-page-stars" style={{ opacity: 0.28 }} />
            <div className="absolute inset-0 dhikr-card-stars" style={{ opacity: 0.16 }} />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 80% 55% at 50% 28%, ${step.gradientFrom}28 0%, ${step.gradientTo}0f 42%, transparent 70%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.06) 0%, rgba(2,6,23,0.30) 100%)' }}
            />
          </motion.div>
        </AnimatePresence>
        {/* Solid dark scrim — keeps text readable */}
        <div className="absolute inset-0 z-[2]" style={{ background: 'rgba(2,6,23,0.52)' }} />
        {/* Edge vignette for depth */}
        <div className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,6,23,0.80)_100%)]" />
      </div>

      {/* ===== FLOATING PROGRESS BAR ===== */}
      <motion.div
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 bg-vanta/60 backdrop-blur-2xl border-b border-border-subtle/30"
      >
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/ijaz" className="text-gold-primary font-amiri text-lg font-bold hover:text-gold-light transition-colors">
            {'\u0627\u0644\u0625\u0639\u062C\u0627\u0632 \u0627\u0644\u0639\u0644\u0645\u064A'}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-xs font-tajawal">
              {currentStep + 1} / {journeySteps.length}
            </span>
            <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${step.gradientFrom}, ${step.gradientTo})` }}
                animate={{ width: progress + '%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== SIDE DOT NAVIGATION ===== */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4">
        {journeySteps.map((s, i) => {
          const isActive = i === currentStep;
          const isUnlocked = unlockedSteps.includes(i);
          return (
            <button
              key={s.id}
              onClick={() => isUnlocked && goToStep(i)}
              className="group relative flex items-center"
              disabled={!isUnlocked}
            >
              {/* Label on hover */}
              <span className="absolute left-10 bg-vanta/90 backdrop-blur-sm text-text-primary text-xs font-tajawal px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap border border-border-subtle/30">
                {s.titleAr}
              </span>
              {/* Dot */}
              <motion.div
                animate={{
                  scale: isActive ? 1.4 : 1,
                  boxShadow: isActive ? `0 0 16px ${s.gradientFrom}60` : '0 0 0px transparent',
                }}
                className="w-3 h-3 rounded-full border-2 transition-colors"
                style={{
                  borderColor: isActive ? s.gradientFrom : isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  backgroundColor: isActive ? s.gradientFrom : isUnlocked ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              />
              {/* Connecting line */}
              {i < journeySteps.length - 1 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4" style={{ background: isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div ref={containerRef} className="relative z-10 min-h-screen flex flex-col justify-center py-24 sm:py-32">
        <div className="container mx-auto px-6 max-w-3xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Step Badge */}
              <ScrollReveal variant="fade-up">
                <div className="text-center mb-8">
                  <motion.div
                    className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-premium mb-6"
                    style={{ borderColor: step.gradientFrom + '30' }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <span className="text-2xl">{step.icon}</span>
                    <span className="text-sm font-tajawal font-bold" style={{ color: step.gradientFrom }}>
                      {step.titleAr}
                    </span>
                    <span className="hidden sm:inline text-xs text-text-muted font-tajawal">({step.titleEn})</span>
                  </motion.div>

                  {/* The Question — cinematic reveal */}
                  <h1 className="font-amiri text-2xl sm:text-3xl md:text-5xl font-bold leading-relaxed">
                    <AnimatedGradientText
                      colors={[step.gradientFrom, step.gradientTo, '#ffffff', step.gradientFrom]}
                    >
                      {step.questionAr}
                    </AnimatedGradientText>
                  </h1>
                </div>
              </ScrollReveal>

              {/* Verse (if any) */}
              {step.verseAr && (
                <motion.div
                  className="text-center my-7 py-5 px-4 rounded-2xl glass-premium cosmic-border"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <p
                    className="font-amiri text-verse-green text-xl md:text-2xl leading-loose verse-glow-pulse"
                  >
                    {step.verseAr}
                  </p>
                  {step.verseSurah && (
                    <p className="text-gold-primary/50 text-xs font-tajawal mt-4">{step.verseSurah}</p>
                  )}
                </motion.div>
              )}

              {/* Content Card */}
              <motion.div
                className="holographic-card rounded-2xl p-5 sm:p-8 mb-7"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="text-text-secondary font-tajawal text-base md:text-lg leading-loose whitespace-pre-line">
                  {step.contentAr}
                </div>
              </motion.div>

              {/* Evidence Points */}
              <div className="space-y-2.5 mb-7">
                <p className="text-text-muted text-xs font-tajawal tracking-widest uppercase mb-4">
                  {'\u0627\u0644\u0623\u062F\u0644\u0629'}
                </p>
                {step.evidenceAr.map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    className="flex items-start gap-3 p-3.5 sm:p-5 rounded-xl glass-premium group hover:scale-[1.01] transition-transform"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs"
                      style={{ background: step.gradientFrom + '18', color: step.gradientFrom }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-text-secondary font-tajawal text-sm leading-relaxed">{ev}</p>
                  </motion.div>
                ))}
              </div>

              {/* Link to related miracle */}
              {step.linkSlug && (
                <motion.div
                  className="text-center mb-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Link
                    to={'/ijaz/miracles/' + step.linkSlug}
                    className="inline-flex items-center gap-2 text-sm font-tajawal px-5 py-2.5 rounded-xl glass-premium hover:scale-105 transition-all group"
                    style={{ borderColor: step.gradientFrom + '30' }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="group-hover:translate-x-1 transition-transform"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span style={{ color: step.gradientFrom }}>{step.linkLabel}</span>
                  </Link>
                </motion.div>
              )}

              {/* ===== NAVIGATION BUTTONS ===== */}
              <motion.div
                className="flex items-center justify-between gap-4 pt-8 border-t border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <button
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl glass-premium text-text-muted hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all font-tajawal text-sm group"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  {'\u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629'}
                </button>

                {currentStep < journeySteps.length - 1 ? (
                  <button
                    onClick={() => goToStep(currentStep + 1)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-tajawal text-sm font-bold text-white transition-all breathing-glow group"
                    style={{ background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})` }}
                  >
                    {'\u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629'}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="group-hover:-translate-x-1 transition-transform"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    to="/ijaz/miracles"
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-tajawal text-sm font-bold text-vanta breathing-glow"
                    style={{ background: 'linear-gradient(135deg, #d4a853, #f0d68a)' }}
                  >
                    {'\u0627\u0633\u062A\u0643\u0634\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u062F\u0644\u0629'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </Link>
                )}
              </motion.div>

              {/* ===== SHAHADA — Final Step ===== */}
              {currentStep === journeySteps.length - 1 && (
                <motion.div
                  className="mt-16 text-center"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                >
                  <div className="holographic-card rounded-2xl p-10 cosmic-border">
                    <p className="text-gold-primary/40 text-xs font-tajawal tracking-widest uppercase mb-8">
                      {'\u0625\u0630\u0627 \u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0627\u0644\u064A\u0642\u064A\u0646...'}
                    </p>
                    <p
                      className="font-amiri text-3xl md:text-4xl lg:text-5xl leading-loose mb-8 verse-glow-pulse"
                      style={{ color: '#d4a853', textShadow: '0 0 60px rgba(212,168,83,0.3)' }}
                    >
                      {'\u0623\u0634\u0647\u062F \u0623\u0646 \u0644\u0627 \u0625\u0644\u0647 \u0625\u0644\u0627 \u0627\u0644\u0644\u0647'}
                      <br />
                      {'\u0648\u0623\u0634\u0647\u062F \u0623\u0646 \u0645\u062D\u0645\u062F\u064B\u0627 \u0631\u0633\u0648\u0644 \u0627\u0644\u0644\u0647'}
                    </p>
                    <div className="flex items-center justify-center gap-4 mb-8">
                      <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold-primary/30" />
                      <span className="text-gold-primary/30 text-2xl">{'\uFDFD'}</span>
                      <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold-primary/30" />
                    </div>
                    <p className="text-text-secondary font-tajawal text-sm leading-relaxed max-w-md mx-auto mb-10">
                      {'\u0647\u0630\u0647 \u0627\u0644\u0634\u0647\u0627\u062F\u0629 \u0647\u064A \u0627\u0644\u0628\u0627\u0628. \u0625\u0630\u0627 \u0622\u0645\u0646\u062A \u0628\u0645\u0627 \u0631\u0623\u064A\u062A\u060C \u0641\u0627\u0646\u0637\u0642\u0647\u0627 \u0628\u0642\u0644\u0628\u0643 \u0623\u0648\u0644\u064B\u0627. \u0627\u0644\u0644\u0647 \u064A\u0633\u0645\u0639 \u062D\u062A\u0649 \u0645\u0627 \u0644\u0645 \u062A\u0646\u0637\u0642 \u0628\u0647.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <Link
                        to="/ijaz/miracles"
                        className="px-7 py-3 rounded-xl font-tajawal font-bold text-sm text-vanta breathing-glow"
                        style={{ background: 'linear-gradient(135deg, #d4a853, #f0d68a)' }}
                      >
                        {'\u0627\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u0623\u062F\u0644\u0629'}
                      </Link>
                      <Link
                        to="/ijaz/refute"
                        className="px-7 py-3 rounded-xl border border-gold-primary/30 text-gold-primary font-tajawal font-bold text-sm hover:bg-gold-primary/10 transition-all"
                      >
                        {'\u0639\u0646\u062F\u064A \u0634\u0628\u0647\u0627\u062A'}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ===== MOBILE STEP DOTS ===== */}
          <div className="flex lg:hidden items-center justify-center gap-2 mt-12">
            {journeySteps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => unlockedSteps.includes(i) && goToStep(i)}
                disabled={!unlockedSteps.includes(i)}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{
                  background: i === currentStep ? s.gradientFrom : unlockedSteps.includes(i) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  transform: i === currentStep ? 'scale(1.4)' : 'scale(1)',
                  boxShadow: i === currentStep ? `0 0 12px ${s.gradientFrom}50` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
