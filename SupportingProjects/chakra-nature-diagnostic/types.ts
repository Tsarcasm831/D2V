
export enum Element {
  FIRE = 'fire',
  WIND = 'wind',
  LIGHTNING = 'lightning',
  WATER = 'water',
  EARTH = 'earth'
}

export enum SkillLevel {
  ACADEMY = 'Academy',
  GENIN = 'Genin',
  CHUNIN = 'Chunin',
  JONIN = 'Jonin',
  KAGE = 'Kage',
  FORBIDDEN = 'Forbidden'
}

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
  description: string;
  requirements?: string;
}

export interface ScoreVector {
  fire: number;
  wind: number;
  lightning: number;
  water: number;
  earth: number;
  yin: number;
  yang: number;
}

export interface Stats {
  ninjutsu: number;
  taijutsu: number;
  genjutsu: number;
  intelligence: number;
  strength: number;
  speed: number;
  stamina: number;
  handSeals: number;
}

export type QuestionType = 'single' | 'multi' | 'rank' | 'like-dislike';

export interface Option {
  id: string;
  text: string;
  vector: Partial<ScoreVector>;
}

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options: Option[];
  weight: number;
  maxSelections?: number;
  dislikeOptions?: Option[]; // For like-dislike questions
}

export interface UserPreferences {
  name: string;
  gender: 'Male' | 'Female';
  hairColor: string;
  skinColor: string;
  hasGlasses: boolean;
}

export interface QuizState {
  currentQuestionIndex: number; // -2: Intro, -1: Personalization, 0+: Questions
  answers: Record<number, any>;
  isFinished: boolean;
  preferences: UserPreferences;
}

export interface FinalResult {
  primary: Element;
  secondary?: Element;
  confidence: 'High' | 'Medium' | 'Low';
  yinYang: 'Yin' | 'Yang' | 'Balanced';
  scores: ScoreVector;
  explanation: string;
  stats: Stats;
  preferences?: UserPreferences;
}
