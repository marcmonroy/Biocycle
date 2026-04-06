import type { Profile } from './supabase';
import { getCurrentTimeSlot, getDaysOfData } from './phaseEngine';

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

  // Milestone cards take priority on exact days
  if (MILESTONE_DAYS[daysOfData]) {
    return MILESTONE_DAYS[daysOfData](formatValue(daysOfData));
  }

  if (daysOfData < 30) {
    // Tier 1: discovery cards
    const key = `${gender}_${slot}`;
    const cards = DISCOVERY_CARDS[key] || DISCOVERY_CARDS[`nonbinary_${slot}`] || DISCOVERY_CARDS['nonbinary_morning'];
    // Rotate by day to vary content
    return cards[daysOfData % cards.length];
  }

  // Tier 2: 173-card Supabase Storage library
  // Card selection by phase + slot — returns URL pattern for Supabase Storage
  // Actual image selection will be refined in Session 2
  const phase = profile.days_of_data != null ? 'follicular' : 'follicular';
  const imageUrl = `https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library/${gender}_${phase}_${slot}_01.jpg`;
  return {
    id: `tier2_${gender}_${phase}_${slot}`,
    imageUrl,
    headline: 'Your patterns are speaking.',
    copyText: 'Jules has been listening. Your biological data is generating real insights now. Check your coach session for today\'s observation.',
    phaseTag: 'Day 30+',
    phaseEmoji: '🔬',
    pillar: 'biology',
  };
}
