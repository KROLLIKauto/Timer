import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Timer from '../Timer/Timer';
import StartButton from '../StartButton/StartButton';
import SplitButton from '../SplitButton/SplitButton';
import TripTable from '../TripTable/TripTable';
import './TripRoom.css';

const TripRoom = ({ rooms, onUpdateRoomStats }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSplits, setCurrentSplits] = useState([]);
  const [showSplitForm, setShowSplitForm] = useState(false);
  const [splitLocation, setSplitLocation] = useState('');
  const [currentSplitTime, setCurrentSplitTime] = useState(0);
  const [trips, setTrips] = useState([]);
  
  const startTimeRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const tripStartTimeRef = useRef(null);

  // Находим комнату по ID
  useEffect(() => {
    const foundRoom = rooms.find(r => r.id === roomId);
    if (foundRoom) {
      setRoom(foundRoom);
      
      // Загружаем поездки этой комнаты
      const roomTrips = JSON.parse(localStorage.getItem(`trips_${roomId}`) || '[]');
      const sortedTrips = roomTrips.sort((a, b) => a.totalTime - b.totalTime);
      setTrips(sortedTrips);
    } else {
      // Если комната не найдена, возвращаем на главную
      navigate('/');
    }
  }, [roomId, rooms, navigate]);

  // Обновляем статистику комнаты при изменении поездок
  useEffect(() => {
    if (room && trips.length > 0) {
      onUpdateRoomStats(roomId);
    }
  }, [trips, roomId, room, onUpdateRoomStats]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - elapsedTime;
      tripStartTimeRef.current = new Date();
      setIsRunning(true);
      setCurrentSplits([]);
      
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 1000);
    }
  };

  const createSplit = () => {
    if (isRunning) {
      setCurrentSplitTime(elapsedTime);
      setShowSplitForm(true);
    }
  };

  const saveSplit = () => {
    if (!splitLocation.trim()) {
      alert('Пожалуйста, укажите место отсечки');
      return;
    }

    const newSplit = {
      id: Date.now(),
      time: currentSplitTime,
      formattedTime: formatTime(currentSplitTime),
      location: splitLocation.trim()
    };

    setCurrentSplits(prev => [...prev, newSplit]);
    setShowSplitForm(false);
    setSplitLocation('');
  };

  const cancelSplit = () => {
    setShowSplitForm(false);
    setSplitLocation('');
  };

  const stopTimer = () => {
    if (isRunning) {
      clearInterval(timerIntervalRef.current);
      setIsRunning(false);
      
      // Сохраняем поездку, только если есть отсечки
      if (currentSplits.length > 0 && room) {
        const newTrip = {
          id: `trip_${Date.now()}`,
          roomId: roomId,
          date: tripStartTimeRef.current.toLocaleString('ru-RU'),
          dateObj: tripStartTimeRef.current,
          totalTime: elapsedTime,
          formattedTotalTime: formatTime(elapsedTime),
          splits: [...currentSplits]
        };

        // Добавляем новую поездку и сортируем
        const updatedTrips = [...trips, newTrip]
          .sort((a, b) => a.totalTime - b.totalTime);
        
        setTrips(updatedTrips);
        localStorage.setItem(`trips_${roomId}`, JSON.stringify(updatedTrips));
        
        alert(`Поездка сохранена! Общее время: ${formatTime(elapsedTime)}`);
      }

      // Сбрасываем состояние
      setElapsedTime(0);
      setCurrentSplits([]);
    }
  };

  const deleteTrip = (tripId) => {
    if (window.confirm('Удалить эту поездку?')) {
      const updatedTrips = trips.filter(trip => trip.id !== tripId);
      setTrips(updatedTrips);
      localStorage.setItem(`trips_${roomId}`, JSON.stringify(updatedTrips));
    }
  };

  const calculateTimeDifference = (currentTrip, previousTrip) => {
    if (!previousTrip) return null;
    
    const differenceMs = currentTrip.totalTime - previousTrip.totalTime;
    const differencePercent = (differenceMs / previousTrip.totalTime) * 100;
    
    return {
      ms: differenceMs,
      percent: differencePercent,
      formatted: formatTime(Math.abs(differenceMs)),
      isFaster: differenceMs < 0
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveSplit();
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  if (!room) {
    return (
      <div className="loading-container">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="trip-room-container">
      {/* Хедер комнаты */}
      <header className="room-header">
        <div className="header-left">
          <Link to="/" className="back-btn">
            ← Назад к списку
          </Link>
          <div className="room-title-section">
            <h1>{room.name}</h1>
            <div className="room-subtitle">
              <span className="room-stat">Поездок: {room.tripCount}</span>
              {room.lastTripDate && (
                <span className="room-stat">Последняя: {room.lastTripDate}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <Link to="/" className="other-rooms-btn">
            Другие поездки
          </Link>
        </div>
      </header>

      {/* Основной контент */}
      <main className="room-content">
        {/* Панель таймера */}
        <div className="timer-section">
          <Timer elapsedTime={elapsedTime} formatTime={formatTime} />
          
          <div className="controls-container">
            {!isRunning ? (
              <StartButton onClick={startTimer} />
            ) : (
              <>
                <SplitButton onClick={createSplit} />
                <button className="main-button stop-button" onClick={stopTimer}>
                  СТОП
                </button>
              </>
            )}
          </div>

          {showSplitForm && (
            <div className="split-form">
              <h3>📍 Сохранение точки отсечки</h3>
              <div className="form-group">
                <label htmlFor="splitLocation">Место отсечки:</label>
                <input
                  type="text"
                  id="splitLocation"
                  value={splitLocation}
                  onChange={(e) => setSplitLocation(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Например: Заправка ЛУКОЙЛ, Пост ГИБДД, и т.д."
                  autoFocus
                />
              </div>
              <div className="form-buttons">
                <button className="secondary-button save-button" onClick={saveSplit}>
                  Сохранить отсечку
                </button>
                <button className="secondary-button cancel-button" onClick={cancelSplit}>
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Текущие отсечки */}
          {currentSplits.length > 0 && (
            <div className="current-splits">
              <h3>📋 Текущие отсечки</h3>
              <ul className="splits-list">
                {currentSplits.map(split => (
                  <li key={split.id} className="split-item">
                    <span className="split-location">{split.location}</span>
                    <span className="split-time">{split.formattedTime}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Таблица поездок */}
        {trips.length > 0 ? (
          <TripTable 
            trips={trips} 
            onDeleteTrip={deleteTrip}
            formatTime={formatTime}
            formatTimeShort={formatTimeShort}
            calculateTimeDifference={calculateTimeDifference}
          />
        ) : (
          <div className="no-trips-message">
            <div className="no-trips-icon">📊</div>
            <h3>В этой поездке еще нет записей</h3>
            <p>Нажмите СТАРТ, сделайте несколько отсечек и сохраните первую поездку</p>
            <div className="how-to-use">
              <h4>Как использовать:</h4>
              <ol>
                <li>Нажмите <strong>СТАРТ</strong> чтобы начать отсчет времени</li>
                <li>В пути нажимайте <strong>ОТСЕЧКА</strong> в ключевых точках</li>
                <li>Введите название точки (заправка, мост, город и т.д.)</li>
                <li>По окончании нажмите <strong>СТОП</strong> чтобы сохранить поездку</li>
                <li>Сравнивайте результаты в таблице ниже</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TripRoom;