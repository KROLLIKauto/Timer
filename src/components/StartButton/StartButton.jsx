import React from 'react';
import './StartButton.css';

const StartButton = ({ onClick }) => {
  return (
    <button className="main-button start-button" onClick={onClick}>
      СТАРТ
    </button>
  );
};

export default StartButton;