import React, { useState } from 'react';
import FishIcon from './icons/FishIcon';

interface RatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const Rating: React.FC<RatingProps> = ({ rating, onRatingChange }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center justify-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          onClick={() => onRatingChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none"
        >
          <FishIcon
            className={`w-8 h-8 transition-colors duration-200 ${
              (hoverRating || rating) >= star
                ? 'text-amber-400'
                : 'text-stone-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default Rating;