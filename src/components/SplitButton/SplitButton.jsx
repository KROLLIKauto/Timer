import React from 'react';
import './SplitButton.css';

const SplitButton = ({ onClick }) => {
  return (
    <button className="main-button split-button" onClick={onClick}>
      ОТСЕЧКА
    </button>
  );
};

export default SplitButton;