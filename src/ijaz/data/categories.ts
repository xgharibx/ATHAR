import { Category, MiracleCategory } from '@/ijaz/types';

export const categories: Category[] = [
  {
    id: 'cosmological',
    name: 'Cosmological Miracles',
    nameAr: 'الإعجاز الكوني',
    description: 'The Quran\'s precise descriptions of cosmic phenomena, from the expansion of the universe to the nature of stars and celestial bodies, confirmed by modern astrophysics.',
    descriptionAr: 'وصف القرآن الدقيق للظواهر الكونية، من توسع الكون إلى طبيعة النجوم والأجرام السماوية، والتي أكدها علم الفلك الحديث.',
    icon: '🌌',
    color: '#4A90D9',
    glowColor: 'rgba(74, 144, 217, 0.3)',
    sceneType: 'cosmos',
    miracleCount: 12,
  },
  {
    id: 'biological',
    name: 'Biological & Anatomical Miracles',
    nameAr: 'الإعجاز البيولوجي والتشريحي',
    description: 'Astounding Quranic descriptions of embryology, human anatomy, and biological processes that align precisely with modern medical science.',
    descriptionAr: 'أوصاف قرآنية مذهلة لعلم الأجنة والتشريح البشري والعمليات البيولوجية التي تتوافق بدقة مع الطب الحديث.',
    icon: '🧬',
    color: '#2DD4A8',
    glowColor: 'rgba(45, 212, 168, 0.3)',
    sceneType: 'microscopic',
    miracleCount: 10,
  },
  {
    id: 'earth-sciences',
    name: 'Earth Sciences',
    nameAr: 'علوم الأرض',
    description: 'From mountains as stabilizing pegs to the darkness of deep seas—the Quran\'s geological and oceanographic revelations verified by modern earth sciences.',
    descriptionAr: 'من الجبال كأوتاد مثبتة إلى ظلمات البحار العميقة — كشوفات القرآن الجيولوجية والمحيطية التي أكدها علم الأرض الحديث.',
    icon: '🌍',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    sceneType: 'earth',
    miracleCount: 8,
  },
  {
    id: 'prophecies',
    name: 'Prophecies & Historical Proofs',
    nameAr: 'النبوءات والبراهين التاريخية',
    description: 'Prophetic foreknowledge from ancient scriptures foretelling Prophet Muhammad (PBUH), and the Quran\'s fulfilled prophecies spanning centuries.',
    descriptionAr: 'العلم المسبق النبوي من الكتب القديمة الذي تنبأ بالنبي محمد ﷺ، ونبوءات القرآن المتحققة عبر القرون.',
    icon: '📜',
    color: '#D4A853',
    glowColor: 'rgba(212, 168, 83, 0.3)',
    sceneType: 'timeline',
    miracleCount: 15,
  },
  {
    id: 'logical-philosophical',
    name: 'Logical & Philosophical Proofs',
    nameAr: 'البراهين المنطقية والفلسفية',
    description: 'Rigorous logical frameworks dismantling atheistic arguments and establishing the rational necessity of a Creator, drawn from the book "بصائر".',
    descriptionAr: 'أطر منطقية صارمة تفكك الحجج الإلحادية وتثبت الضرورة العقلية لوجود الخالق، مستخلصة من كتاب «بصائر».',
    icon: '🧠',
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    sceneType: 'logic',
    miracleCount: 12,
  },
];

export const getCategoryById = (id: MiracleCategory): Category | undefined => {
  return categories.find((c) => c.id === id);
};

export const getCategoryColor = (id: MiracleCategory): string => {
  return getCategoryById(id)?.color ?? '#d4a853';
};

export const getCategoryGlow = (id: MiracleCategory): string => {
  return getCategoryById(id)?.glowColor ?? 'rgba(212, 168, 83, 0.3)';
};
