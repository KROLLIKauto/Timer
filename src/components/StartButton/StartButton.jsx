import React from 'react';
import './StartButton.css';

const StartButton = ({ onClick, children }) => {
  return (
    <button className="main-button start-button" onClick={onClick}>
      {children}
    </button>
  );
};

export default StartButton;