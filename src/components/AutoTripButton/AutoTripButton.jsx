import React from 'react';
import './AutoTripButton.css';

const AutoTripButton = ({ onClick, isActive, isRunning, distance = 1 }) => {
  return (
    <button 
      className={`auto-trip-button ${isActive ? 'active' : ''} ${isRunning ? 'running' : ''}`}
      onClick={onClick}
      disabled={isRunning && !isActive}
    >
      <div className="button-content">
        <div className="button-icon">
          {isActive ? '🗺️' : '📍'}
        </div>
        <div className="button-text">
          <div className="button-title">
            {isActive ? 'СТОП (по карте)' : 'СТАРТ (по карте)'}
          </div>
          <div className="button-subtitle">
            {isActive ? 'Завершить авто-поездку' : `Авто-отсечки каждые ${distance} км`}
          </div>
        </div>
      </div>
      
      {isActive && (
        <div className="active-indicator">
          <div className="pulse-dot"></div>
          <span>Авто-режим</span>
        </div>
      )}
    </button>
  );
};

export default AutoTripButton;