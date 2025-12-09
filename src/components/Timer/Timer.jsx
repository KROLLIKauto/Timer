import React from 'react';
import './Timer.css';

const Timer = ({ elapsedTime, formatTime }) => {
  return (
    <div className="timer-display">
      {formatTime(elapsedTime)}
    </div>
  );
};

export default Timer;