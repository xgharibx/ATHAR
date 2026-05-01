export type WuduStep = {
  id: number;
  title: string;
  description: string;
  times: number; // recommended repetitions
  animClass: string; // CSS animation hint class
  icon: string; // emoji
};

export const WUDU_STEPS: WuduStep[] = [
  {
    id: 1,
    title: "النية",
    description: "أنوِ في قلبك الوضوء لرفع الحدث الأصغر تقرباً إلى الله، دون الحاجة إلى التلفظ بالنية.",
    times: 1,
    animClass: "anim-heart",
    icon: "🫀",
  },
  {
    id: 2,
    title: "التسمية",
    description: "قل: «بسم الله» في بداية الوضوء، وهي سنة مؤكدة عند جمهور الفقهاء.",
    times: 1,
    animClass: "anim-pulse",
    icon: "🤲",
  },
  {
    id: 3,
    title: "غسل الكفين",
    description: "اغسل كفيك ثلاث مرات من رسغيك حتى أطراف الأصابع، مع تخليل الأصابع جيداً.",
    times: 3,
    animClass: "anim-wash",
    icon: "👐",
  },
  {
    id: 4,
    title: "المضمضة والاستنشاق",
    description: "خذ الماء في فمك وأدر به وأخرجه (المضمضة)، ثم اسحب الماء إلى أنفك وانثره (الاستنشاق). ثلاث مرات.",
    times: 3,
    animClass: "anim-splash",
    icon: "💧",
  },
  {
    id: 5,
    title: "غسل الوجه",
    description: "اغسل وجهك ثلاث مرات من أعلى الجبهة إلى أسفل الذقن ومن الأذن إلى الأذن. الوجه كله يجب أن يصله الماء.",
    times: 3,
    animClass: "anim-face",
    icon: "😌",
  },
  {
    id: 6,
    title: "غسل اليدين إلى المرفقين",
    description: "ابدأ باليد اليمنى فاغسلها من أطراف الأصابع حتى المرفق ثلاث مرات، ثم اليسرى كذلك.",
    times: 3,
    animClass: "anim-arms",
    icon: "💪",
  },
  {
    id: 7,
    title: "مسح الرأس والأذنين",
    description: "امسح رأسك مرة واحدة بأصابعك المبلّلة من الأمام إلى الخلف ثم رُدّهما، ثم أدخل السبابتين في الأذنين وامسحهما.",
    times: 1,
    animClass: "anim-head",
    icon: "👆",
  },
  {
    id: 8,
    title: "غسل القدمين إلى الكعبين",
    description: "ابدأ بالقدم اليمنى وخلّل أصابعها واغسلها ثلاث مرات إلى الكعب، ثم اليسرى كذلك.",
    times: 3,
    animClass: "anim-feet",
    icon: "🦶",
  },
  {
    id: 9,
    title: "دعاء الفراغ من الوضوء",
    description: "بعد الانتهاء قل: «أشهد أن لا إله إلا الله وأشهد أن محمداً عبده ورسوله، اللهم اجعلني من التوابين واجعلني من المتطهرين».",
    times: 1,
    animClass: "anim-dua",
    icon: "🙏",
  },
];
