export interface LessonContent {
  sign: string;
  label: string;
  reviewStatus: 'draft' | 'approved';
  reviewedBy: string | null;
  reviewedAt: string | null;
  demoPath: string | null;
  captionPath?: string | null;
  cue: string;
}
