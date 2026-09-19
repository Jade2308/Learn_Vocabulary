export interface ReviewInput {
  repetitionLevel: number;
  intervalDays: number;
  easeFactor: number;
  rating: 1 | 2 | 3 | 4; // 1 Again, 2 Hard, 3 Good, 4 Easy
}

export function calculateNextReview(data: ReviewInput) {
  let { repetitionLevel, intervalDays, easeFactor, rating } = data;

  if (rating === 1) {
    repetitionLevel = 0;
    intervalDays = 1;
  } else {
    if (repetitionLevel === 0) intervalDays = 1;
    else if (repetitionLevel === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitionLevel += 1;
  }

  easeFactor = easeFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    repetitionLevel,
    intervalDays,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    nextReviewAt: nextReviewDate,
  };
}

