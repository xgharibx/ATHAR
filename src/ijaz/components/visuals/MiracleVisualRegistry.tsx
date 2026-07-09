import { ComponentType, lazy, Suspense } from 'react';

export interface MiracleVisualProps {
  className?: string;
}

// Dynamic imports for each individual miracle visual — code-split per miracle
const visualMap: Record<string, ComponentType<MiracleVisualProps>> = {
  // ═══ COSMOLOGICAL ═══
  'miracle-universe-expansion': lazy(() => import('./cosmos/UniverseExpansionVisual')),
  'miracle-big-bang': lazy(() => import('./cosmos/BigBangVisual')),
  'miracle-orbits': lazy(() => import('./cosmos/CelestialOrbitsVisual')),
  'miracle-pulsars': lazy(() => import('./cosmos/PulsarVisual')),
  'miracle-fine-tuning': lazy(() => import('./cosmos/FineTuningVisual')),
  'miracle-iron-sent-down': lazy(() => import('./cosmos/IronSentDownVisual')),
  'miracle-solar-apex': lazy(() => import('./cosmos/SolarApexVisual')),
  'miracle-black-holes': lazy(() => import('./cosmos/BlackHolesVisual')),

  // ═══ BIOLOGICAL ═══
  'miracle-embryology-stages': lazy(() => import('./bio/EmbryologyVisual')),
  'miracle-three-darknesses': lazy(() => import('./bio/ThreeDarknessesVisual')),
  'miracle-life-from-water': lazy(() => import('./bio/LifeFromWaterVisual')),
  'miracle-honey-healing': lazy(() => import('./bio/HoneyHealingVisual')),
  'miracle-milk-production': lazy(() => import('./bio/MilkProductionVisual')),
  'miracle-skin-pain-receptors': lazy(() => import('./bio/SkinPainReceptorsVisual')),
  'miracle-fingerprints': lazy(() => import('./bio/FingerprintsVisual')),
  'miracle-wind-pollination': lazy(() => import('./bio/WindPollinationVisual')),
  'miracle-lying-forelock': lazy(() => import('./bio/LyingForelockVisual')),
  'miracle-female-bee': lazy(() => import('./bio/FemaleBeeVisual')),
  'miracle-night-covering': lazy(() => import('./bio/NightCoveringVisual')),

  // ═══ EARTH SCIENCES ═══
  'miracle-mountains-pegs': lazy(() => import('./earth/MountainsPegsVisual')),
  'miracle-deep-sea-darkness': lazy(() => import('./earth/DeepSeaDarknessVisual')),
  'miracle-two-seas-barrier': lazy(() => import('./earth/TwoSeasBarrierVisual')),
  'miracle-earth-shape': lazy(() => import('./earth/EarthShapeVisual')),
  'miracle-clouds-weight': lazy(() => import('./earth/CloudsWeightVisual')),
  'miracle-lowest-point-earth': lazy(() => import('./earth/LowestPointVisual')),
  'miracle-water-cycle': lazy(() => import('./earth/WaterCycleVisual')),

  // ═══ PROPHECY ═══
  'miracle-prophecy-romans': lazy(() => import('./prophecy/RomansVictoryVisual')),
  'miracle-prophecy-torah': lazy(() => import('./prophecy/ProphecyTorahVisual')),
  'miracle-prophecy-bible': lazy(() => import('./prophecy/ProphecyBibleVisual')),
  'miracle-unlettered-prophet': lazy(() => import('./prophecy/UnletteredProphetVisual')),
  'miracle-prophecy-makkah': lazy(() => import('./prophecy/ConquestMakkahVisual')),
  'miracle-prophecy-badr': lazy(() => import('./prophecy/BattleBadrVisual')),
  'miracle-pharaoh-body': lazy(() => import('./prophecy/PharaohBodyVisual')),

  // ═══ LOGICAL ═══
  'miracle-kalam-cosmological': lazy(() => import('./logic/KalamCosmologicalVisual')),
  'miracle-contingency': lazy(() => import('./logic/ContingencyVisual')),
  'miracle-tasalsul': lazy(() => import('./logic/InfiniteRegressVisual')),
  'miracle-design-argument': lazy(() => import('./logic/DesignArgumentVisual')),
  'miracle-morality-argument': lazy(() => import('./logic/MoralArgumentVisual')),
  'miracle-consciousness': lazy(() => import('./logic/ConsciousnessVisual')),
  'miracle-speech-faculty': lazy(() => import('./logic/SpeechFacultyVisual')),
  'miracle-dna-information': lazy(() => import('./logic/DNAInformationVisual')),
  'miracle-prophet-paraclete': lazy(() => import('./prophecy/ParacleteVisual')),
  'miracle-origin-of-life': lazy(() => import('./logic/OriginOfLifeVisual')),
  'miracle-quran-challenge': lazy(() => import('./logic/QuranChallengeVisual')),
  'miracle-prophet-isaiah': lazy(() => import('./prophecy/IsaiahProphecyVisual')),
  'miracle-quran-word-balance': lazy(() => import('./logic/QuranWordBalanceVisual')),
  // Phase 4 — Orders 46–50
  'miracle-subatomic-quran': lazy(() => import('./cosmos/SubatomicQuranVisual')),
  'miracle-cloud-formation': lazy(() => import('./earth/CloudFormationVisual')),
  'miracle-ant-communication': lazy(() => import('./bio/AntCommunicationVisual')),
  'miracle-universe-fate': lazy(() => import('./cosmos/UniverseFateVisual')),
  'miracle-heart-neuroscience': lazy(() => import('./bio/HeartNeuroscienceVisual')),
  // Phase 5 — Orders 51–55
  'miracle-embryo-mudghah': lazy(() => import('./bio/EmbryoMudghahVisual')),
  'miracle-pulsar-stars': lazy(() => import('./cosmos/PulsarStarsVisual')),
  'miracle-atmosphere-ceiling': lazy(() => import('./earth/AtmosphereCeilingVisual')),
  'miracle-water-origin-life': lazy(() => import('./bio/WaterOriginLifeVisual')),
  'miracle-roman-lowest-land': lazy(() => import('./earth/RomanLowestLandVisual')),
  // Phase 6 — Orders 56–60
  'miracle-sleep-neuroscience': lazy(() => import('./bio/SleepNeuroscienceVisual')),
  'miracle-mountains-stability': lazy(() => import('./earth/MountainsStabilityVisual')),
  'miracle-stars-navigation': lazy(() => import('./cosmos/StarsNavigationVisual')),
  'miracle-honey-antibacterial': lazy(() => import('./bio/HoneyAntibacterialVisual')),
  'miracle-cosmic-web': lazy(() => import('./cosmos/CosmicWebVisual')),
  // Phase 7 — Orders 61–65
  'miracle-iron-from-stars': lazy(() => import('./cosmos/IronFromStarsVisual')),
  'miracle-barriers-between-seas': lazy(() => import('./earth/BarriersBetweenSeasVisual')),
  'miracle-embryo-bones-flesh': lazy(() => import('./bio/EmbryoBonesFieshVisual')),
  'miracle-night-day-coiling': lazy(() => import('./cosmos/NightDayCoilingVisual')),
  'miracle-water-cycle-quran': lazy(() => import('./earth/HydrologicalCycleQuranVisual')),
  // Phase 8 — Orders 66–70
  'miracle-pain-receptors-skin': lazy(() => import('./bio/PainReceptorsSkinVisual')),
  'miracle-sun-orbital-motion': lazy(() => import('./cosmos/SunOrbitalMotionVisual')),
  'miracle-pairs-creation': lazy(() => import('./cosmos/PairsCreationVisual')),
  'miracle-spider-web-weakness': lazy(() => import('./bio/SpiderWebWeaknessVisual')),
  'miracle-deep-ocean-darkness': lazy(() => import('./earth/DeepOceanDarknessVisual')),
  // Phase 9 — Orders 71–75
  'miracle-quran-number-nineteen': lazy(() => import('./logic/NumberNineteenVisual')),
  'miracle-black-holes-quran': lazy(() => import('./cosmos/BlackHolesQuranVisual')),
  'miracle-earth-rotation-axis': lazy(() => import('./earth/EarthAxisSeasonsVisual')),
  'miracle-human-proportion-ratio': lazy(() => import('./bio/HumanProportionVisual')),
  'miracle-lightning-thunder': lazy(() => import('./earth/LightningThunderVisual')),
  // Phase 10 — Orders 76–80
  'miracle-sun-self-luminous': lazy(() => import('./cosmos/SunMoonLightVisual')),
  'miracle-sex-determination-sperm': lazy(() => import('./bio/SexDeterminationVisual')),
  'miracle-quran-preservation-hafiz': lazy(() => import('./logic/QuranPreservationVisual')),
  'miracle-fig-olive-nutrition': lazy(() => import('./bio/FigOliveNutritionVisual')),
  'miracle-backbone-ribs-sperm': lazy(() => import('./bio/BackboneRibsSpermVisual')),

  // Phase 11 — Orders 81–85
  'miracle-camel-water-storage': lazy(() => import('./bio/CamelAdaptationVisual')),
  'miracle-whale-jonah-biology': lazy(() => import('./earth/WhaleJonahVisual')),
  'miracle-running-water-death': lazy(() => import('./earth/FlowingWaterVisual')),
  'miracle-quran-color-vision': lazy(() => import('./earth/MountainColorsVisual')),
  'miracle-photosynthesis-quran': lazy(() => import('./bio/PhotosynthesisVisual')),
};

export function getMiracleVisual(miracleId: string): ComponentType<MiracleVisualProps> | null {
  return visualMap[miracleId] || null;
}

export default function MiracleVisual({ miracleId, className }: { miracleId: string; className?: string }) {
  const VisualComponent = visualMap[miracleId];
  if (!VisualComponent) return null;
  return (
    <Suspense fallback={null}>
      <VisualComponent className={className} />
    </Suspense>
  );
}
