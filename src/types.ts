export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sentiment?: SentimentResult;
}

export interface SentimentResult {
  label: string;        // "Positive 😊" / "Negative 😠"
  label_en: string;     // "positive" / "negative"
  label_id: number;     // 0 = positive, 1 = negative
  confidence: number;   // 0.0 – 1.0
  probabilities: {
    'Positive 😊': number;
    'Negative 😠': number;
  };
}