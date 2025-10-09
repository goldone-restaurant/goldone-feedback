export interface FeedbackData {
  foodQuality: number;
  service: number;
  ambiance: number;
  recommend: boolean | null;
  comments: string;
  visitDate: string;
  phoneNumber: string;
  receiptImage: File | null;
  foodComplaint: string;
  serviceComplaint: string;
  ambianceComplaint: string;
}

export interface GeminiAnalysis {
  summary: string;
  sentiment: 'Tích cực' | 'Tiêu cực' | 'Trung tính';
  keywords: string[];
}