import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Timer from '../Timer/Timer';
import StartButton from '../StartButton/StartButton';
import SplitButton from '../SplitButton/SplitButton';
import TripTable from '../TripTable/TripTable';
import YandexMap from '../YandexMap/YandexMap';
import { calculateTimeDifference, formatTime } from '../../utils/tripCalculations'
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

  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationMarkers, setLocationMarkers] = useState([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

    // НОВЫЕ состояния для авто-режима
  const [autoModeActive, setAutoModeActive] = useState(false);
  const [autoCheckpoints, setAutoCheckpoints] = useState([]);
  const [autoTotalDistance, setAutoTotalDistance] = useState(0);
  const [locationHistory, setLocationHistory] = useState([]);
  
  // Для авто-отсечек
  const autoCheckpointRef = useRef([]);
  const autoModeStartTimeRef = useRef(null);
  const lastAutoCheckpointRef = useRef(null);
  
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
    // Используем ref для предотвращения слишком частых обновлений
    if (room && trips.length > 0) {
      // Обновляем только если действительно изменилось количество поездок
      const currentTripCount = trips.length;
      const prevTripCount = JSON.parse(localStorage.getItem(`tripCount_${roomId}`)) || 0;
      
      if (currentTripCount !== prevTripCount) {
        onUpdateRoomStats(roomId);
        localStorage.setItem(`tripCount_${roomId}`, currentTripCount.toString());
      }
    }
  }, [trips.length, roomId, room, onUpdateRoomStats]); // ← Используем только length

  // Функция для старта авто-режима
  const startAutoMode = () => {
    if (isRunning) {
      alert('Сначала остановите текущий таймер');
      return;
    }
    
    // Начинаем обычный таймер
    startTimer();
    
    // Активируем авто-режим
    setAutoModeActive(true);
    setAutoCheckpoints([]);
    setAutoTotalDistance(0);
    autoCheckpointRef.current = [];
    autoModeStartTimeRef.current = new Date();
    lastAutoCheckpointRef.current = null;
    
    // Начинаем трекинг на карте
    // (режим будет активирован через пропс в LocationMap)
  };

  // Функция для остановки авто-режима
  const stopAutoMode = () => {
    if (!autoModeActive) return;
    
    // Останавливаем таймер
    stopTimer();
    
    // Сохраняем поездку в таблицу
    if (autoCheckpoints.length > 0) {
      const autoTrip = {
        id: `autotrip_${Date.now()}`,
        date: autoModeStartTimeRef.current.toLocaleString('ru-RU'),
        dateObj: autoModeStartTimeRef.current,
        totalTime: elapsedTime,
        formattedTotalTime: formatTime(elapsedTime),
        totalDistance: autoTotalDistance,
        isAutoTrip: true,
        splits: autoCheckpoints.map((checkpoint, index) => ({
          id: Date.now() + index,
          time: checkpoint.time,
          formattedTime: formatTime(checkpoint.time),
          location: `${checkpoint.kilometers.toFixed(2)} км`,
          distance: `${checkpoint.kilometers.toFixed(2)} км`,
          auto: true,
          coordinates: {
            latitude: checkpoint.latitude,
            longitude: checkpoint.longitude
          }
        }))
      };

      // Сохраняем в таблицу
      const updatedTrips = [...trips, autoTrip]
        .sort((a, b) => a.totalTime - b.totalTime);
      
      setTrips(updatedTrips);
      localStorage.setItem(`trips_${roomId}`, JSON.stringify(updatedTrips));
      
      // Показываем уведомление
      alert(`Авто-поездка сохранена! 
        Пройдено: ${(autoTotalDistance / 1000).toFixed(2)} км
        Время: ${formatTime(elapsedTime)}
        Отсечек: ${autoCheckpoints.length}`);
    }
    
    // Деактивируем режим
    setAutoModeActive(false);
  };

  // Функция-обработчик для авто-отсечек с карты
  const handleDistanceCheckpoint = (checkpointData) => {
    if (!autoModeActive || !isRunning) return;
    
    const checkpointTime = Date.now() - startTimeRef.current;
    
    const newCheckpoint = {
      id: Date.now(),
      time: checkpointTime,
      formattedTime: formatTime(checkpointTime),
      latitude: checkpointData.latitude,
      longitude: checkpointData.longitude,
      kilometers: checkpointData.kilometers,
      totalDistance: checkpointData.totalDistance,
      checkpointNumber: checkpointData.checkpointNumber
    };
    
    // Добавляем в состояние
    setAutoCheckpoints(prev => [...prev, newCheckpoint]);
    autoCheckpointRef.current = [...autoCheckpointRef.current, newCheckpoint];
    
    // Обновляем общую дистанцию
    setAutoTotalDistance(checkpointData.totalDistance);
    
    // Добавляем маркер на карту
    const newMarker = {
      lat: checkpointData.latitude,
      lng: checkpointData.longitude,
      name: `${checkpointData.kilometers.toFixed(2)} км`,
      time: formatTime(checkpointTime),
      distance: `${checkpointData.kilometers.toFixed(2)} км`,
      auto: true
    };
    
    setLocationMarkers(prev => [...prev, newMarker]);
    
    // Показываем уведомление (опционально)
    console.log(`Авто-отсечка: ${checkpointData.kilometers.toFixed(2)} км`);
  };

  // Обновляем функцию handleLocationUpdate для сбора истории
  const handleLocationUpdate = (locationData) => {
    setCurrentLocation([locationData.latitude, locationData.longitude]);
    
    // Сохраняем в историю
    const locationPoint = {
      ...locationData,
      timestamp: new Date().toISOString(),
      autoMode: autoModeActive
    };
    
    setLocationHistory(prev => {
      const updated = [...prev, locationPoint];
      // Сохраняем только последние 1000 точек
      return updated.slice(-1000);
    });
    
    // Сохраняем в localStorage
    const storedHistory = JSON.parse(
      localStorage.getItem(`location_history_${roomId}`) || '[]'
    );
    
    storedHistory.push(locationPoint);
    if (storedHistory.length > 1000) {
      storedHistory.splice(0, storedHistory.length - 1000);
    }
    
    localStorage.setItem(
      `location_history_${roomId}`,
      JSON.stringify(storedHistory)
    );
  };

   // Добавить текущее местоположение как отсечку
  const addLocationAsSplit = () => {
    if (!currentLocation || !splitLocation.trim()) return;
    
    // Создаем маркер для карты
    const newMarker = {
      lat: currentLocation[0],
      lng: currentLocation[1],
      name: splitLocation.trim(),
      time: formatTime(elapsedTime)
    };
    
    setLocationMarkers(prev => [...prev, newMarker]);
    
    // Автоматически заполняем поле отсечки если пустое
    if (!splitLocation) {
      setSplitLocation(`Точка ${locationMarkers.length + 1} (${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)})`);
    }
    
    alert(`Местоположение добавлено как отсечка: ${newMarker.name}`);
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
      location: splitLocation.trim(),
      // Добавляем координаты если есть
      coordinates: currentLocation ? {
        latitude: currentLocation[0],
        longitude: currentLocation[1],
        accuracy: 50 // пример точности
      } : null
    };

    // Добавляем маркер на карту если есть координаты
    if (currentLocation) {
      const newMarker = {
        lat: currentLocation[0],
        lng: currentLocation[1],
        name: splitLocation.trim(),
        time: formatTime(currentSplitTime)
      };
      setLocationMarkers(prev => [...prev, newMarker]);
    }

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
              <div className='start-button-container'>
                <StartButton onClick={startTimer} > Старт </StartButton>
                <StartButton onClick={startAutoMode} > Auto Start </StartButton>
              </div>
            ) : (
              <>
                <SplitButton onClick={createSplit} />
                <button className="main-button stop-button" onClick={stopTimer}>
                  СТОП
                </button>
                <button className="main-button stop-button" onClick={stopAutoMode}>
                  Auto Stop
                </button>
              </>
            )}
          </div>

          {/* Статистика авто-режима */}
          {autoModeActive && (
            <div className="auto-mode-stats">
              <h3>🚗 Авто-поездка</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Отсечек:</span>
                  <span className="stat-value">{autoCheckpoints.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Дистанция:</span>
                  <span className="stat-value">{(autoTotalDistance / 1000).toFixed(2)} км</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Текущий км:</span>
                  <span className="stat-value">
                    {autoCheckpoints.length > 0 
                      ? `${autoCheckpoints[autoCheckpoints.length - 1].kilometers.toFixed(2)} км`
                      : '0 км'}
                  </span>
                </div>
              </div>
              
              {/* Список авто-отсечек */}
              {autoCheckpoints.length > 0 && (
                <div className="auto-checkpoints">
                  <h4>Авто-отсечки:</h4>
                  <div className="checkpoints-list">
                    {autoCheckpoints.slice(-5).reverse().map((checkpoint, index) => (
                      <div key={checkpoint.id} className="checkpoint-item">
                        <span className="checkpoint-distance">
                          {checkpoint.kilometers.toFixed(2)} км
                        </span>
                        <span className="checkpoint-time">
                          {checkpoint.formattedTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

        {/* Мини-карта */}
        <div className="map-section">
            <h3>
              {autoModeActive ? '🗺️ Авто-трекинг (1 км)' : '📍 Ваше местоположение'}
            </h3>
            <YandexMap 
              onLocationUpdate={handleLocationUpdate}
              onDistanceCheckpoint={handleDistanceCheckpoint}
              showTrack={isRunning}
              markers={locationMarkers}
              currentLocation={currentLocation}
              autoMode={autoModeActive}
              distanceThreshold={1000}
            />
          
          {isRunning && currentLocation && (
            <button 
              className="location-split-btn"
              onClick={addLocationAsSplit}
              title="Добавить текущее местоположение как отсечку"
            >
              📍 Добавить как отсечку
            </button>
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