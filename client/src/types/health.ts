export type SleepSession = {
  date: string;
  totalSleepMin: number;
  remMin: number;
  deepMin: number;
  lightMin: number;
  sleepScore: number;
  hrvMs: number;
  avgHr: number;
};

export type NutritionLog = {
  loggedAt: number;
  mealName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export type TrainingSession = {
  performedAt: number;
  name: string;
  sport: string;
  durationMin: number;
  sets: Array<{ exercise: string; setNum: number; weightLbs: number; reps: number; rpe: number }>;
};

export type Biomarker = {
  testedOn: string;
  name: string;
  value: number;
  unit: string;
  labRangeLow?: number;
  labRangeHigh?: number;
  optimalLow?: number;
  optimalHigh?: number;
};

export type Supplement = {
  _id?: string;
  name: string;
  doseMg?: number;
  frequency?: string;
  timing?: string;
  active: boolean;
};

export type JournalEntry = {
  date: string;
  moodScore: number;
  energyScore: number;
  notes: string;
};
