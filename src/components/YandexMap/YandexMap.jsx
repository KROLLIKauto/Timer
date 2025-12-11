import React, { useEffect, useRef, useState, useCallback } from 'react';
import './YandexMap.css';

const YANDEX_API_KEY = '264ffed5-637c-4e77-9a60-05badbb33961'; // Ваш ключ

const YandexMap = ({
  markers = [],
  currentLocation = null,
  showTrack = true,
  onLocationUpdate,
  onDistanceCheckpoint,
  autoMode = false,
  distanceThreshold = 1000
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isInitializedRef = useRef(false);
  
  // Refs для хранения объектов на карте
  const userPlacemarkRef = useRef(null); // Маркер пользователя
  const routePolylineRef = useRef(null);  // Линия маршрута
  const checkpointPlacemarksRef = useRef([]); // Все маркеры отсечек
  const trackPointsRef = useRef([]); // Точки для построения трека
  
  // Состояния для UI
  const [isTracking, setIsTracking] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const watchIdRef = useRef(null);
  const distanceAccumulatorRef = useRef(0);
  const lastPositionRef = useRef(null);

  // 1. Функция расчета расстояния между точками (в метрах)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // 2. Функция инициализации карты
  const initMap = () => {
    if (!mapContainerRef.current || !window.ymaps || mapInstanceRef.current) return;

    try {
      const center = currentLocation || [55.7558, 37.6173];
      
      mapInstanceRef.current = new window.ymaps.Map(mapContainerRef.current, {
        center: center,
        zoom: 13,
        controls: ['zoomControl', 'fullscreenControl']
      });
      
      console.log('Карта Яндекс успешно инициализирована');
      
      // Сразу добавляем маркеры, если они есть
      updateMarkers();
      
      // Добавляем текущую позицию пользователя, если она есть
      if (currentLocation) {
        updateUserPosition(currentLocation);
      }
      
    } catch (error) {
      console.error('Ошибка при создании карты:', error);
    }
  };

  // 3. Обновление позиции пользователя на карте
  const updateUserPosition = (position) => {
    if (!mapInstanceRef.current || !window.ymaps) return;
    
    // Удаляем старый маркер
    if (userPlacemarkRef.current) {
      mapInstanceRef.current.geoObjects.remove(userPlacemarkRef.current);
    }
    
    // Создаем новый маркер пользователя
    userPlacemarkRef.current = new window.ymaps.Placemark(
      position,
      {
        hintContent: 'Ваше местоположение',
        balloonContent: `
          <b>Вы здесь</b><br/>
          Широта: ${position[0].toFixed(6)}<br/>
          Долгота: ${position[1].toFixed(6)}
        `
      },
      {
        preset: 'islands#redCircleIcon',
        draggable: false
      }
    );
    
    mapInstanceRef.current.geoObjects.add(userPlacemarkRef.current);
  };

  // 4. Обновление всех маркеров (отсечек)
  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.ymaps) return;
    
    // Удаляем все старые маркеры отсечек
    checkpointPlacemarksRef.current.forEach(marker => {
      mapInstanceRef.current.geoObjects.remove(marker);
    });
    checkpointPlacemarksRef.current = [];
    
    // Добавляем новые маркеры
    markers.forEach((marker, index) => {
      try {
        const placemark = new window.ymaps.Placemark(
          [marker.lat, marker.lng],
          {
            hintContent: marker.name || `Точка ${index + 1}`,
            balloonContent: `
              <b>${marker.name || `Точка ${index + 1}`}</b><br/>
              ${marker.time ? `Время: ${marker.time}<br/>` : ''}
              ${marker.distance ? `Дистанция: ${marker.distance}` : ''}
              ${marker.auto ? '<br/><i>Автоматическая отсечка</i>' : ''}
            `
          },
          {
            preset: marker.auto ? 'islands#greenCircleIcon' : 'islands#blueCircleIcon',
            draggable: false
          }
        );
        
        mapInstanceRef.current.geoObjects.add(placemark);
        checkpointPlacemarksRef.current.push(placemark);
      } catch (err) {
        console.error('Ошибка добавления маркера:', err);
      }
    });
  };

  // 5. Обновление линии трека
  const updateTrackLine = () => {
    if (!mapInstanceRef.current || !window.ymaps || trackPointsRef.current.length < 2) return;
    
    // Удаляем старую линию
    if (routePolylineRef.current) {
      mapInstanceRef.current.geoObjects.remove(routePolylineRef.current);
    }
    
    // Создаем новую линию
    routePolylineRef.current = new window.ymaps.Polyline(
      trackPointsRef.current,
      {},
      {
        strokeColor: '#3498db',
        strokeWidth: 3,
        strokeOpacity: 0.7
      }
    );
    
    mapInstanceRef.current.geoObjects.add(routePolylineRef.current);
  };

  // 6. Функции управления геолокацией
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Геолокация не поддерживается');
      return;
    }
    
    setIsTracking(true);
    setTotalDistance(0);
    distanceAccumulatorRef.current = 0;
    lastPositionRef.current = null;
    trackPointsRef.current = [];
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = [position.coords.latitude, position.coords.longitude];
        
        // Обновляем позицию на карте
        updateUserPosition(newPos);
        mapInstanceRef.current?.setCenter(newPos);
        
        // Добавляем точку в трек
        if (showTrack) {
          trackPointsRef.current.push(newPos);
          updateTrackLine();
        }
        
        // Рассчитываем дистанцию
        if (lastPositionRef.current) {
          const dist = calculateDistance(
            lastPositionRef.current[0], lastPositionRef.current[1],
            newPos[0], newPos[1]
          );
          
          const newTotalDistance = totalDistance + dist;
          setTotalDistance(newTotalDistance);
          
          // Проверка на авто-отсечки
          if (autoMode && onDistanceCheckpoint) {
            distanceAccumulatorRef.current += dist;
            
            if (distanceAccumulatorRef.current >= distanceThreshold) {
              const kilometers = (newTotalDistance / 1000).toFixed(2);
              
              onDistanceCheckpoint({
                latitude: newPos[0],
                longitude: newPos[1],
                totalDistance: newTotalDistance,
                kilometers: parseFloat(kilometers),
                checkpointNumber: Math.floor(newTotalDistance / distanceThreshold)
              });
              
              distanceAccumulatorRef.current -= distanceThreshold;
            }
          }
        }
        
        lastPositionRef.current = newPos;
        
        // Отправляем обновление наружу
        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: newPos[0],
            longitude: newPos[1],
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            speed: position.coords.speed || 0,
            totalDistance: totalDistance
          });
        }
      },
      (error) => {
        console.error('Ошибка геолокации:', error.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, [calculateDistance, onLocationUpdate, onDistanceCheckpoint, autoMode, distanceThreshold, showTrack, totalDistance]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // 7. Получение текущей позиции (одноразово)
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        updateUserPosition(newPos);
        mapInstanceRef.current?.setCenter(newPos);
        
        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: newPos[0],
            longitude: newPos[1],
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
        }
      },
      (err) => console.error('Ошибка получения позиции:', err.message)
    );
  }, [onLocationUpdate]);

  // 8. Основной эффект для загрузки API
  useEffect(() => {
    if (isInitializedRef.current || window.ymaps) {
      if (window.ymaps && !mapInstanceRef.current) {
        initMap();
      }
      return;
    }

    const existingScript = document.querySelector(`script[src*="api-maps.yandex.ru"]`);
    if (existingScript) {
      const handleLoad = () => {
        isInitializedRef.current = true;
        initMap();
      };
      
      if (window.ymaps) {
        handleLoad();
      } else {
        existingScript.addEventListener('load', handleLoad);
        return () => existingScript.removeEventListener('load', handleLoad);
      }
      return;
    }

    isInitializedRef.current = true;
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps && mapContainerRef.current) {
        window.ymaps.ready(initMap);
      }
    };

    script.onerror = () => {
      console.error('Не удалось загрузить скрипт Яндекс.Карт');
      isInitializedRef.current = false;
    };

    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      stopTracking();
    };
  }, []);

  // 9. Эффекты для обновления данных
  useEffect(() => {
    if (mapInstanceRef.current && currentLocation) {
      updateUserPosition(currentLocation);
      mapInstanceRef.current.setCenter(currentLocation);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [markers]);

  useEffect(() => {
    if (mapInstanceRef.current && trackPointsRef.current.length > 1) {
      updateTrackLine();
    }
  }, [trackPointsRef.current.length]);

  // 10. Рендер UI управления
  return (
    <div className="yandex-map-container">
      {/* Панель управления картой */}
      <div className="map-controls">
        <button 
          onClick={getCurrentLocation}
          className="map-control-btn"
          title="Найти меня"
        >
          📍
        </button>
        
        <button 
          onClick={isTracking ? stopTracking : startTracking}
          className={`map-control-btn ${isTracking ? 'tracking-active' : ''}`}
          title={isTracking ? 'Остановить трекинг' : 'Начать трекинг'}
        >
          {isTracking ? '⏸️' : '▶️'}
        </button>
        
        {totalDistance > 0 && (
          <div className="distance-info">
            Пройдено: {(totalDistance / 1000).toFixed(2)} км
          </div>
        )}
      </div>
      
      {/* Контейнер для карты */}
      <div
        ref={mapContainerRef}
        className="yandex-map"
        style={{ width: '100%', height: '300px' }}
      />
    </div>
  );
};

export default YandexMap;