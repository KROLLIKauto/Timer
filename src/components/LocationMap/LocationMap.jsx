import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import './LocationMap.css';

// Иконка для маркера
const createIcon = (color = 'red') => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${color === 'red' ? '20' : '15'}px;
        height: ${color === 'red' ? '20' : '15'}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Компонент для автоматического перемещения карты
const MapUpdater = ({ position, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position && map) {
      map.setView(position, zoom);
    }
  }, [position, zoom, map]);
  
  return null;
};

const LocationMap = ({ 
  onLocationUpdate,
  onDistanceCheckpoint, // Новая функция для отсечек по расстоянию
  showTrack = true,
  markers = [],
  currentLocation = null,
  autoMode = false, // Режим автоматических отсечек
  distanceThreshold = 1000 // Порог в метрах (1 км)
}) => {
  const [position, setPosition] = useState(currentLocation || [55.7558, 37.6173]);
  const [accuracy, setAccuracy] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackPoints, setTrackPoints] = useState([]);
  const [error, setError] = useState(null);
  const [zoom] = useState(13);
  const [totalDistance, setTotalDistance] = useState(0);
  const [lastCheckpointPosition, setLastCheckpointPosition] = useState(null);
  
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const distanceAccumulatorRef = useRef(0);

  // Функция для расчета расстояния между двумя точками (в метрах)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Получение текущей геолокации
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      return;
    }

    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPosition);
        setAccuracy(pos.coords.accuracy);
        
        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
        }
      },
      (err) => {
        setError(`Ошибка геолокации: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Начать отслеживание положения с авто-отсечками
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsTracking(true);
    setError(null);
    setTotalDistance(0);
    distanceAccumulatorRef.current = 0;
    setTrackPoints([]);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPosition = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPosition);
        setAccuracy(pos.coords.accuracy);
        
        // Добавляем точку в трек
        const updatedTrackPoints = [...trackPoints, newPosition];
        setTrackPoints(updatedTrackPoints);
        
        // Рассчитываем дистанцию
        if (trackPoints.length > 0) {
          const lastPoint = trackPoints[trackPoints.length - 1];
          const segmentDistance = calculateDistance(
            lastPoint[0], lastPoint[1],
            newPosition[0], newPosition[1]
          );
          
          const newTotalDistance = totalDistance + segmentDistance;
          setTotalDistance(newTotalDistance);
          
          // Накапливаем расстояние для авто-отсечек
          if (autoMode) {
            distanceAccumulatorRef.current += segmentDistance;
            
            // Создаем отсечку каждые distanceThreshold метров
            if (distanceAccumulatorRef.current >= distanceThreshold) {
              const kilometers = (newTotalDistance / 1000).toFixed(2);
              
              if (onDistanceCheckpoint) {
                onDistanceCheckpoint({
                  latitude: newPosition[0],
                  longitude: newPosition[1],
                  totalDistance: newTotalDistance,
                  kilometers: parseFloat(kilometers),
                  checkpointNumber: Math.floor(newTotalDistance / distanceThreshold)
                });
              }
              
              // Сбрасываем аккумулятор
              distanceAccumulatorRef.current -= distanceThreshold;
              setLastCheckpointPosition(newPosition);
            }
          }
        }
        
        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            speed: pos.coords.speed || 0,
            totalDistance: totalDistance
          });
        }
      },
      (err) => {
        setError(`Ошибка отслеживания: ${err.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  // Остановить отслеживание
  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Тоггл отслеживания
  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Очистить трек
  const clearTrack = () => {
    setTrackPoints([]);
    setTotalDistance(0);
    distanceAccumulatorRef.current = 0;
  };

  // Автоматически запрашиваем геолокацию при монтировании
  useEffect(() => {
    getCurrentLocation();
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="location-map-container">
      <div className="map-controls">
        <button 
          onClick={getCurrentLocation}
          className="map-control-btn"
          title="Обновить местоположение"
        >
          📍
        </button>
        
        <button 
          onClick={toggleTracking}
          className={`map-control-btn ${isTracking ? 'tracking-active' : ''}`}
          title={isTracking ? 'Остановить отслеживание' : 'Начать отслеживание'}
        >
          {isTracking ? '⏸️' : '▶️'}
        </button>
        
        {showTrack && trackPoints.length > 0 && (
          <button 
            onClick={clearTrack}
            className="map-control-btn"
            title="Очистить трек"
          >
            🗑️
          </button>
        )}
        
        <div className="location-info">
          {totalDistance > 0 && (
            <span className="distance-info">
              Дистанция: {(totalDistance / 1000).toFixed(2)} км
            </span>
          )}
          {accuracy && (
            <span className="accuracy">
              Точность: ~{Math.round(accuracy)}м
            </span>
          )}
          {autoMode && isTracking && (
            <span className="auto-mode-indicator">
              🔄 Авто: {distanceThreshold / 1000} км
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="location-error">
          ⚠️ {error}
        </div>
      )}

      <div className="map-wrapper">
        <MapContainer
          center={position}
          zoom={zoom}
          style={{ height: '300px', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater position={position} zoom={zoom} />
          
          {/* Маркер текущей позиции */}
          <Marker position={position} icon={createIcon('red')}>
            <Popup>
              Ваше текущее местоположение
              <br />
              Широта: {position[0].toFixed(5)}
              <br />
              Долгота: {position[1].toFixed(5)}
              <br />
              Пройдено: {(totalDistance / 1000).toFixed(2)} км
              {accuracy && (
                <>
                  <br />
                  Точность: ~{Math.round(accuracy)} метров
                </>
              )}
            </Popup>
          </Marker>

          {/* Дополнительные маркеры (отсечки) */}
          {markers.map((marker, index) => (
            <Marker 
              key={`marker-${index}`} 
              position={[marker.lat, marker.lng]} 
              icon={createIcon(marker.auto ? 'green' : 'blue')}
            >
              <Popup>
                {marker.name || `Точка ${index + 1}`}
                <br />
                {marker.time && `Время: ${marker.time}`}
                <br />
                {marker.distance && `Дистанция: ${marker.distance}`}
                {marker.auto && <br/>}
                {marker.auto && '📍 Автоматическая отсечка'}
              </Popup>
            </Marker>
          ))}

          {/* Трек пути (полилиния) */}
          {showTrack && trackPoints.length > 1 && (
            <Polyline 
              positions={trackPoints} 
              color="#3498db" 
              weight={3}
              opacity={0.7}
            />
          )}

          {/* Линия от последней отсечки */}
          {lastCheckpointPosition && (
            <Marker 
              position={lastCheckpointPosition} 
              icon={createIcon('orange')}
            >
              <Popup>
                Последняя авто-отсечка
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationMap;