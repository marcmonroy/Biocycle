import type { Profile } from './supabase';
import { getCurrentTimeSlot, getDaysOfData, getCurrentPhase } from './phaseEngine';

export interface Card {
  id: string;
  imageUrl: string | null;
  headline: string;
  copyText: string;
  phaseTag: string;
  phaseEmoji: string;
  pillar: 'life' | 'biology' | 'financial';
}

// ── Financial milestone cards ────────────────────────────────────────────
const MILESTONE_DAYS: Record<number, (value: string) => Card> = {
  7: (val) => ({
    id: 'milestone_7',
    imageUrl: null,
    headline: 'One week of data.',
    copyText: `One week of data. Your portfolio is at ${val}. Jules is starting to see patterns. Keep showing up.`,
    phaseTag: 'Week 1',
    phaseEmoji: '📊',
    pillar: 'financial',
  }),
  14: (val) => ({
    id: 'milestone_14',
    imageUrl: null,
    headline: 'Halfway to your first grand target.',
    copyText: `Halfway to your first grand target. Your portfolio is at ${val}. Your data is building patterns Jules can see even if you cannot yet.`,
    phaseTag: 'Week 2',
    phaseEmoji: '📈',
    pillar: 'financial',
  }),
  21: (_val) => ({
    id: 'milestone_21',
    imageUrl: null,
    headline: 'Nine days to go.',
    copyText: 'Nine days to go. In 9 days Jules tells you something true about yourself. Based on 21 days of real data you have given her.',
    phaseTag: 'Day 21',
    phaseEmoji: '🎯',
    pillar: 'financial',
  }),
  29: (_val) => ({
    id: 'milestone_29',
    imageUrl: null,
    headline: 'Tomorrow is Day 30.',
    copyText: 'Tomorrow is Day 30. Tomorrow Jules delivers your first personal biological observation. Do not miss your session tomorrow.',
    phaseTag: 'Day 29',
    phaseEmoji: '⭐',
    pillar: 'financial',
  }),
};

// ── Discovery cards (Days 0–29) ──────────────────────────────────────────
const DISCOVERY_CARDS: Record<string, Card[]> = {
  // Young female (18–35)
  female_morning: [
    {
      id: 'f_bio_morning',
      imageUrl: null,
      headline: 'Your estrogen is rising right now.',
      copyText: 'Your estrogen is rising right now. Most women report their sharpest thinking and highest social energy in this phase. Is that true for you? Jules is listening.',
      phaseTag: 'Biology',
      phaseEmoji: '🧬',
      pillar: 'biology',
    },
    {
      id: 'f_life_morning',
      imageUrl: null,
      headline: 'Your most magnetic days are coming.',
      copyText: 'Pretty soon Jules will know which days you are naturally magnetic — when your social energy peaks and people are drawn to you without you trying. Great for planning first dates, important conversations, and the nights you actually want to show up fully.',
      phaseTag: 'Life',
      phaseEmoji: '✨',
      pillar: 'life',
    },
  ],
  female_midday: [
    {
      id: 'f_fin_midday',
      imageUrl: null,
      headline: 'Your portfolio is growing.',
      copyText: 'Your biological data has real value. At 30 days your data becomes research-eligible. At 90 days consistent traders average $47 in research value. You are building something real.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
    },
  ],
  female_evening: [
    {
      id: 'f_life_evening',
      imageUrl: null,
      headline: 'Your body keeps the score.',
      copyText: 'Jules tracks how your social energy, stress tolerance, and emotional state shift through each phase. After 30 days you will know yourself in a way most people never do.',
      phaseTag: 'Pattern',
      phaseEmoji: '🔮',
      pillar: 'life',
    },
  ],
  female_night: [
    {
      id: 'f_bio_night',
      imageUrl: null,
      headline: 'Your cycle is your calendar.',
      copyText: 'Every phase of your cycle has a biological purpose. Menstrual is for rest. Follicular is for starting. Ovulatory is for connecting. Luteal is for finishing. Jules will tell you where you are and what to do with it.',
      phaseTag: 'Biology',
      phaseEmoji: '🌙',
      pillar: 'biology',
    },
  ],

  // Young male (18–35)
  male_morning: [
    {
      id: 'm_bio_morning',
      imageUrl: null,
      headline: 'Your biological prime time.',
      copyText: 'Your testosterone is highest within 30 minutes of waking. This is your biological prime time. Jules is tracking exactly how long it lasts for you specifically — most men do not know it varies by 2–3 hours person to person.',
      phaseTag: 'Biology',
      phaseEmoji: '⚡',
      pillar: 'biology',
    },
    {
      id: 'm_life_morning',
      imageUrl: null,
      headline: 'Your best days are predictable.',
      copyText: 'Pretty soon Jules will tell you which days your testosterone peak aligns with your social confidence — the days when conversations flow, charm comes naturally, and you are genuinely at your best with people. Plan accordingly.',
      phaseTag: 'Life',
      phaseEmoji: '🎯',
      pillar: 'life',
    },
  ],
  male_midday: [
    {
      id: 'm_fin_midday',
      imageUrl: null,
      headline: 'Your data has real value.',
      copyText: 'Male biological data is among the most underrepresented in health research. Your daily patterns — energy, stress, cognition — are worth real money to researchers. At 30 days your portfolio unlocks.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
    },
  ],
  male_evening: [
    {
      id: 'm_bio_evening',
      imageUrl: null,
      headline: 'Evening is your second wind.',
      copyText: 'Testosterone takes a secondary dip in the afternoon then rebounds slightly in the evening. Jules tracks whether your energy follows the classic pattern or your own unique rhythm.',
      phaseTag: 'Biology',
      phaseEmoji: '🌆',
      pillar: 'biology',
    },
  ],
  male_night: [
    {
      id: 'm_life_night',
      imageUrl: null,
      headline: 'Sleep is where testosterone is made.',
      copyText: 'Most testosterone production happens in deep sleep. Jules asks about your sleep quality every morning because it directly predicts your energy, confidence, and focus the next day.',
      phaseTag: 'Recovery',
      phaseEmoji: '🌙',
      pillar: 'biology',
    },
  ],

  // Perimenopause female (40+)
  female_peri_morning: [
    {
      id: 'f_peri_bio_morning',
      imageUrl: null,
      headline: 'Your hormones are recalibrating.',
      copyText: 'Perimenopause is not a decline — it is a transition. Your estrogen patterns are becoming more variable and Jules is tracking exactly what that means for your energy, sleep, and mood day by day.',
      phaseTag: 'Perimenopause',
      phaseEmoji: '🔥',
      pillar: 'biology',
    },
    {
      id: 'f_peri_life_morning',
      imageUrl: null,
      headline: 'This phase has its own intelligence.',
      copyText: 'Pretty soon Jules will know which days your clarity and focus peak — even in perimenopause. Many women find their most decisive thinking happens in unexpected windows. Jules finds yours.',
      phaseTag: 'Life',
      phaseEmoji: '✨',
      pillar: 'life',
    },
  ],
  female_peri_midday: [
    {
      id: 'f_peri_fin_midday',
      imageUrl: null,
      headline: 'Your data is more valuable at 40+.',
      copyText: 'Researchers pay a 30% premium for perimenopausal data. Your biological patterns during this transition are among the most scientifically valuable datasets that exist. You are building something rare.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
    },
  ],
  female_peri_evening: [
    {
      id: 'f_peri_bio_evening',
      imageUrl: null,
      headline: 'Sleep is your most important metric.',
      copyText: 'Perimenopausal sleep disruption affects everything — mood, cognition, relationships. Jules tracks your sleep quality every single morning because in this phase, sleep data is your most predictive variable.',
      phaseTag: 'Biology',
      phaseEmoji: '🌙',
      pillar: 'biology',
    },
  ],
  female_peri_night: [
    {
      id: 'f_peri_life_night',
      imageUrl: null,
      headline: 'You know yourself better than ever.',
      copyText: 'At this stage you have lived through enough cycles to recognize your patterns. Jules accelerates that self-knowledge by giving it a data foundation. Knowing yourself pays — literally.',
      phaseTag: 'Wisdom',
      phaseEmoji: '🔮',
      pillar: 'life',
    },
  ],

  // Andropause male (40+)
  male_andro_morning: [
    {
      id: 'm_andro_bio_morning',
      imageUrl: null,
      headline: 'Your testosterone curve is changing.',
      copyText: 'After 40 testosterone declines gradually — but the pace varies enormously by individual. Jules tracks your energy, cognition, and drive patterns to show you exactly where you are on your personal curve.',
      phaseTag: 'Andropause',
      phaseEmoji: '⚖️',
      pillar: 'biology',
    },
    {
      id: 'm_andro_life_morning',
      imageUrl: null,
      headline: 'Quality over quantity.',
      copyText: 'Pretty soon Jules will know which mornings you are genuinely sharp and which require a slower start. At this phase that distinction matters more than ever. Plan your highest-stakes work accordingly.',
      phaseTag: 'Life',
      phaseEmoji: '🎯',
      pillar: 'life',
    },
  ],
  male_andro_midday: [
    {
      id: 'm_andro_fin_midday',
      imageUrl: null,
      headline: 'Andropause data commands a premium.',
      copyText: 'Male longitudinal data after 40 is among the rarest in clinical research. Your patterns over the next 90 days will be worth significantly more than standard data. You are building something valuable.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
    },
  ],
  male_andro_evening: [
    {
      id: 'm_andro_bio_evening',
      imageUrl: null,
      headline: 'Recovery is your competitive edge.',
      copyText: 'After 40 recovery quality matters more than peak performance. Jules tracks your sleep, stress, and energy recovery to show you when you are genuinely restored versus running on reserves.',
      phaseTag: 'Recovery',
      phaseEmoji: '🌆',
      pillar: 'biology',
    },
  ],
  male_andro_night: [
    {
      id: 'm_andro_life_night',
      imageUrl: null,
      headline: 'Consistency is the strategy.',
      copyText: 'At this stage the men who perform best are the ones who know their patterns and protect their recovery. Jules gives you the data to stop guessing and start optimizing with precision.',
      phaseTag: 'Pattern',
      phaseEmoji: '🌙',
      pillar: 'biology',
    },
  ],

  // Non-binary
  nonbinary_morning: [
    {
      id: 'nb_bio_morning',
      imageUrl: null,
      headline: 'Your biology is uniquely yours.',
      copyText: 'BioCycle tracks your individual hormonal rhythm — not a template. Jules listens to what your body actually does, not what the textbooks predict. After 30 days you will see patterns no one else can show you.',
      phaseTag: 'Biology',
      phaseEmoji: '🧬',
      pillar: 'biology',
    },
  ],
  nonbinary_midday: [
    {
      id: 'nb_life_midday',
      imageUrl: null,
      headline: 'Know yourself before it happens.',
      copyText: 'Jules will learn when your energy peaks, when your creativity is highest, and when you need to protect your time. Your biological intelligence is the most personal data set that exists.',
      phaseTag: 'Pattern',
      phaseEmoji: '✨',
      pillar: 'life',
    },
  ],
  nonbinary_evening: [
    {
      id: 'nb_fin_evening',
      imageUrl: null,
      headline: 'Your data. Your terms.',
      copyText: 'BioCycle gives you full ownership of your biological data. You decide if it contributes to research. You earn from every transaction. Your biology pays.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
    },
  ],
  nonbinary_night: [
    {
      id: 'nb_bio_night',
      imageUrl: null,
      headline: 'Patterns emerge with consistency.',
      copyText: 'The most valuable data is the data that shows up every day. Jules is patient. Every session — morning, afternoon, night — adds a data point that makes the picture clearer.',
      phaseTag: 'Consistency',
      phaseEmoji: '🌙',
      pillar: 'biology',
    },
  ],
};

function formatValue(days: number): string {
  const value = Math.max(1.0, days * 0.15);
  return `$${value.toFixed(2)}`;
}

export function getCardForUser(profile: Profile): Card {
  const daysOfData = getDaysOfData(profile);
  const slot = getCurrentTimeSlot();
  const gender = profile.genero ?? 'nonbinary';

  // Calculate age for 40+ routing
  const age = profile.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(profile.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;

  // Milestone cards take priority on exact days
  if (MILESTONE_DAYS[daysOfData]) {
    return MILESTONE_DAYS[daysOfData](formatValue(daysOfData));
  }

  if (daysOfData < 30) {
    // Determine demographic key including 40+ variants
    let genderKey: string;
    if (gender === 'female' && age >= 40) {
      genderKey = 'female_peri';
    } else if (gender === 'male' && age >= 40) {
      genderKey = 'male_andro';
    } else {
      genderKey = gender;
    }

    const key = `${genderKey}_${slot}`;
    const cards = DISCOVERY_CARDS[key]
      || DISCOVERY_CARDS[`${gender}_${slot}`]
      || DISCOVERY_CARDS[`nonbinary_${slot}`]
      || DISCOVERY_CARDS['nonbinary_morning'];

    return cards[daysOfData % cards.length];
  }

  // Tier 2: Day 30+ — use real phase from phaseEngine
  const phaseResult = getCurrentPhase(profile);
  const phaseTag = phaseResult.displayName;
  const phaseEmoji = phaseResult.emoji;

  const imageUrl = `https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library/${gender}_${phaseResult.phase}_${slot}_01.jpg`;

  return {
    id: `tier2_${gender}_${phaseResult.phase}_${slot}`,
    imageUrl,
    headline: 'Your patterns are speaking.',
    copyText: `You are in your ${phaseTag.toLowerCase()} right now. Jules has 30 days of your data and is beginning to see what this phase means specifically for you. Check in with Jules to hear what she has noticed.`,
    phaseTag,
    phaseEmoji,
    pillar: 'biology',
  };
}
