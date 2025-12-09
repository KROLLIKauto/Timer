import React, { useState } from 'react';
import './TripTable.css';

const TripTable = ({ 
  trips, 
  onDeleteTrip, 
  formatTime, 
  formatTimeShort,
  calculateTimeDifference 
}) => {
  const [expandedTripId, setExpandedTripId] = useState(null);

  // Находим максимальное количество отсечек среди всех поездок
  const maxSplitsCount = Math.max(...trips.map(trip => trip.splits.length));

  // Создаем заголовки для столбцов отсечек
  const splitHeaders = Array.from({ length: maxSplitsCount }, (_, i) => 
    `Участок ${i + 1}`
  );

  const toggleTripDetails = (tripId) => {
    setExpandedTripId(expandedTripId === tripId ? null : tripId);
  };

  return (
    <div className="trip-table-container">
      <h2>📊 Сравнение поездок</h2>
      <p className="table-subtitle">
        Поездки отсортированы по общему времени (от быстрой к медленной)
      </p>
      
      <div className="table-scroll-container">
        <table className="trip-table">
          <thead>
            <tr>
              <th rowSpan="2">Дата поездки</th>
              <th rowSpan="2">Отставание/Опережение</th>
              <th rowSpan="2">Общее время</th>
              <th colSpan={maxSplitsCount}>Время на участках</th>
              <th rowSpan="2">Действия</th>
            </tr>
            <tr>
              {splitHeaders.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.map((trip, index) => {
              const prevTrip = index > 0 ? trips[index - 1] : null;
              const timeDiff = calculateTimeDifference(trip, prevTrip);
              
              return (
                <React.Fragment key={trip.id}>
                  <tr className="trip-row">
                    <td>{trip.date}</td>
                    <td>
                      {timeDiff ? (
                        <div className={`time-diff ${timeDiff.isFaster ? 'faster' : 'slower'}`}>
                          <span className="diff-icon">
                            {timeDiff.isFaster ? '↓' : '↑'}
                          </span>
                          <span className="diff-text">
                            {timeDiff.isFaster ? 'Быстрее на' : 'Медленнее на'} 
                            <strong>{timeDiff.formatted}</strong>
                          </span>
                          <span className="diff-percent">
                            ({timeDiff.isFaster ? '-' : '+'}{Math.abs(timeDiff.percent).toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="first-trip">Первая поездка</span>
                      )}
                    </td>
                    <td className="total-time-cell">
                      <strong>{trip.formattedTotalTime || formatTime(trip.totalTime)}</strong>
                    </td>
                    
                    {/* Столбцы с временами участков */}
                    {Array.from({ length: maxSplitsCount }).map((_, i) => {
                      const split = trip.splits[i];
                      const prevSplit = prevTrip?.splits[i];
                      let segmentDiff = null;
                      
                      if (split && prevSplit) {
                        const diffMs = split.time - prevSplit.time;
                        segmentDiff = {
                          ms: diffMs,
                          isFaster: diffMs < 0,
                          formatted: formatTimeShort(Math.abs(diffMs))
                        };
                      }
                      
                      return (
                        <td key={i} className="segment-cell">
                          {split ? (
                            <div className="segment-info">
                              <div className="segment-time">
                                {split.formattedTime || formatTime(split.time)}
                              </div>
                              {segmentDiff && (
                                <div className={`segment-diff ${segmentDiff.isFaster ? 'faster' : 'slower'}`}>
                                  {segmentDiff.isFaster ? '▼' : '▲'} {segmentDiff.formatted}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      );
                    })}
                    
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="details-btn"
                          onClick={() => toggleTripDetails(trip.id)}
                        >
                          {expandedTripId === trip.id ? 'Скрыть' : 'Подробнее'}
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => onDeleteTrip(trip.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Детали поездки */}
                  {expandedTripId === trip.id && (
                    <tr className="trip-details">
                      <td colSpan={maxSplitsCount + 5}>
                        <div className="details-content">
                          <h4>Детали поездки</h4>
                          <div className="splits-details">
                            <h5>Все отсечки:</h5>
                            <ul className="splits-list">
                              {trip.splits.map((split, idx) => (
                                <li key={split.id} className="split-detail-item">
                                  <span className="split-index">{idx + 1}.</span>
                                  <span className="split-location">{split.location}</span>
                                  <span className="split-time">
                                    {split.formattedTime || formatTime(split.time)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {trip.splits.length === 0 && (
                              <p className="no-splits">В этой поездке нет отсечек</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="table-stats">
        <div className="stat-item">
          <span className="stat-label">Всего поездок:</span>
          <span className="stat-value">{trips.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Самая быстрая:</span>
          <span className="stat-value">
            {trips[0]?.formattedTotalTime || '-'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Самая медленная:</span>
          <span className="stat-value">
            {trips[trips.length - 1]?.formattedTotalTime || '-'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TripTable;