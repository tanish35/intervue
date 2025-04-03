export type PollOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

export type Question = {
  id: string;
  text: string;
  options: PollOption[];
  timer: number;
  status: "PENDING" | "ACTIVE" | "CLOSED";
  results?: {
    optionId: string;
    percentage: number;
    _count: number;
  }[];
};

export type Participant = {
  id: string;
  username: string;
};

export type PollRoom = {
  id: string;
  code: string;
  title: string;
  activeQuestion: Question | null;
  status: "ACTIVE" | "CLOSED";
  questions: Question[];
  participants: Participant[];
  history: Question[];
};

export type PollHistoryItem = {
  id: string;
  text: string;
  timer: number;
  status: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    _count: number;
    percentage: number;
  }>;
  userAnswerId?: string | null;
};

export type PollHistory = {
  pollId: string;
  code: string;
  title: string;
  history: PollHistoryItem[];
};
