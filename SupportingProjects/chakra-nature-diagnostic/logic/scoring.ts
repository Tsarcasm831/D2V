
import { Element, ScoreVector, FinalResult, Question, Option, Stats } from '../types';
import { QUESTIONS, ELEMENT_LORE } from '../constants';

const INITIAL_VECTOR: ScoreVector = {
  fire: 0,
  wind: 0,
  lightning: 0,
  water: 0,
  earth: 0,
  yin: 0,
  yang: 0
};

export function calculateResults(answers: Record<number, any>): FinalResult {
  // Use a slight random jitter to start scores so ties are broken randomly
  const scores = { ...INITIAL_VECTOR };
  Object.keys(scores).forEach(k => {
    const key = k as keyof ScoreVector;
    scores[key] = Math.random() * 0.01; 
  });

  let contradictions = 0;

  QUESTIONS.forEach((q) => {
    const answer = answers[q.id];
    if (!answer) return;

    if (q.type === 'single') {
      const option = q.options.find(o => o.id === answer);
      if (option) addVector(scores, option.vector, q.weight);
    } else if (q.type === 'multi') {
      const selected = answer as string[];
      const weight = q.weight / 2;
      selected.forEach(id => {
        const option = q.options.find(o => o.id === id);
        if (option) addVector(scores, option.vector, weight);
      });
    } else if (q.type === 'rank') {
      const rankedIds = answer as string[]; // List of IDs in order
      rankedIds.forEach((id, index) => {
        const points = { 0: 3, 1: 2, 2: 1, 3: 0 }[index] || 0;
        const option = q.options.find(o => o.id === id);
        if (option) addVector(scores, option.vector, points * q.weight);
      });
    } else if (q.type === 'like-dislike') {
      const { like, dislike } = answer;
      const likeOpt = q.options.find(o => o.id === like);
      const dislikeOpt = q.dislikeOptions?.find(o => o.id === dislike);
      if (likeOpt) addVector(scores, likeOpt.vector, q.weight);
      if (dislikeOpt) addVector(scores, dislikeOpt.vector, q.weight);
    }
  });

  // Calculate Primary and Secondary
  const elementKeys = [Element.FIRE, Element.WIND, Element.LIGHTNING, Element.WATER, Element.EARTH];
  const sortedElements = elementKeys.sort((a, b) => scores[b] - scores[a]);

  const primary = sortedElements[0];
  const second = sortedElements[1];
  let secondary: Element | undefined = undefined;

  if (scores[second] >= 0.8 * scores[primary] && scores[primary] > 0) {
    secondary = second;
  }

  contradictions = checkConsistency(answers);

  const margin = scores[primary] - scores[second];
  let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
  if (margin > 8 && contradictions <= 1) confidence = 'High';
  else if (margin < 2 || contradictions >= 3) confidence = 'Low';

  let yinYang: 'Yin' | 'Yang' | 'Balanced' = 'Balanced';
  if (scores.yin > scores.yang + 3) yinYang = 'Yin';
  else if (scores.yang > scores.yin + 3) yinYang = 'Yang';

  const stats = generateStats(primary, secondary, scores, yinYang);
  const explanation = buildExplanation(primary, secondary, yinYang, answers);

  return {
    primary,
    secondary,
    confidence,
    yinYang,
    scores,
    explanation,
    stats
  };
}

function generateStats(primary: Element, secondary: Element | undefined, scores: ScoreVector, yinYang: string): Stats {
  const getRand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min) / 2;
  
  // Base stats start at 1.5 - 3.5
  let stats: Stats = {
    ninjutsu: 2 + getRand(0, 4),
    taijutsu: 2 + getRand(0, 4),
    genjutsu: 1.5 + getRand(0, 3),
    intelligence: 2 + getRand(0, 4),
    strength: 2 + getRand(0, 4),
    speed: 2 + getRand(0, 4),
    stamina: 2 + getRand(0, 4),
    handSeals: 2 + getRand(0, 4)
  };

  // Bias based on Elements
  if (primary === Element.FIRE) { stats.ninjutsu += 1; stats.stamina += 0.5; }
  if (primary === Element.WIND) { stats.speed += 1; stats.ninjutsu += 0.5; }
  if (primary === Element.LIGHTNING) { stats.speed += 1.5; stats.taijutsu += 0.5; }
  if (primary === Element.WATER) { stats.intelligence += 1; stats.handSeals += 1; }
  if (primary === Element.EARTH) { stats.strength += 1; stats.stamina += 1; }

  // Yin/Yang adjustments
  if (yinYang === 'Yin') { stats.genjutsu += 1; stats.intelligence += 0.5; stats.taijutsu -= 0.5; }
  if (yinYang === 'Yang') { stats.strength += 1; stats.stamina += 0.5; stats.genjutsu -= 0.5; }

  // Cap stats at 5 and min at 0.5
  Object.keys(stats).forEach(k => {
    const key = k as keyof Stats;
    stats[key] = Math.max(0.5, Math.min(5, stats[key]));
  });

  return stats;
}

function addVector(target: ScoreVector, source: Partial<ScoreVector>, weight: number) {
  Object.keys(source).forEach(key => {
    const k = key as keyof ScoreVector;
    target[k] += (source[k] || 0) * weight;
  });
}

function checkConsistency(answers: Record<number, any>): number {
  let count = 0;
  if (answers[3] && answers[18]) {
    const dom3 = getDominant(3, answers[3]);
    const dom18 = getDominant(18, answers[18]);
    if (areOpposites(dom3, dom18)) count++;
  }
  if (answers[1] && answers[20]) {
    const dom1 = getDominant(1, answers[1]);
    const dom20 = getDominant(20, answers[20]);
    if (dom1 !== dom20) count += 0.5;
  }
  return Math.floor(count);
}

function getDominant(qId: number, answer: any): Element {
  const q = QUESTIONS.find(x => x.id === qId);
  if (!q) return Element.FIRE;
  const tempScores = { fire: 0, wind: 0, lightning: 0, water: 0, earth: 0, yin: 0, yang: 0 };
  if (q.type === 'single') {
    const opt = q.options.find(o => o.id === answer);
    if (opt) addVector(tempScores, opt.vector, 1);
  }
  const elementKeys = [Element.FIRE, Element.WIND, Element.LIGHTNING, Element.WATER, Element.EARTH];
  return elementKeys.sort((a, b) => tempScores[b] - tempScores[a])[0];
}

function areOpposites(a: Element, b: Element): boolean {
  const ops: Record<string, string[]> = {
    [Element.FIRE]: [Element.WATER],
    [Element.WATER]: [Element.FIRE],
    [Element.LIGHTNING]: [Element.EARTH],
    [Element.EARTH]: [Element.LIGHTNING, Element.WIND],
    [Element.WIND]: [Element.EARTH]
  };
  return ops[a]?.includes(b) || false;
}

function buildExplanation(primary: Element, secondary: Element | undefined, yinYang: string, answers: Record<number, any>): string {
  const primaryName = primary.charAt(0).toUpperCase() + primary.slice(1);
  const secondaryPart = secondary ? ` complemented by ${secondary.charAt(0).toUpperCase() + secondary.slice(1)} style` : '';
  const yinYangPart = ` Your chakra manifests with a distinct ${yinYang} bias.`;

  return `You exhibit a powerful affinity for ${primaryName}${secondaryPart}.${yinYangPart} 
          Your choices consistently favor ${ELEMENT_LORE[primary].description.split('.')[0].toLowerCase()}. 
          From the way you react to sudden ambushes to your fundamental training philosophy, your chakra nature is undeniable.`;
}
