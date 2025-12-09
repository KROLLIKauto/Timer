import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoomList from './components/RoomList/RoomList';
import TripRoom from './components/TripRoom/TripRoom';
import './App.css';

function App() {
  const [rooms, setRooms] = useState([]);

  // Загрузка комнат из localStorage при загрузке приложения
  useEffect(() => {
    const savedRooms = JSON.parse(localStorage.getItem('tripRooms') || '[]');
    setRooms(savedRooms);
  }, []);

  // Добавление новой комнаты
  const addRoom = (roomName) => {
    const newRoom = {
      id: `room_${Date.now()}`,
      name: roomName,
      createdAt: new Date().toISOString(),
      tripCount: 0,
      lastTripDate: null
    };

    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    localStorage.setItem('tripRooms', JSON.stringify(updatedRooms));
  };

  // Обновление статистики комнаты
  const updateRoomStats = (roomId) => {
    const updatedRooms = rooms.map(room => {
      if (room.id === roomId) {
        const roomTrips = JSON.parse(localStorage.getItem(`trips_${roomId}`) || '[]');
        return {
          ...room,
          tripCount: roomTrips.length,
          lastTripDate: roomTrips.length > 0 
            ? new Date(roomTrips[0].date).toLocaleDateString('ru-RU')
            : null
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    localStorage.setItem('tripRooms', JSON.stringify(updatedRooms));
  };

  // Удаление комнаты
  const deleteRoom = (roomId) => {
    if (window.confirm('Удалить эту поездку? Все данные будут потеряны.')) {
      const updatedRooms = rooms.filter(room => room.id !== roomId);
      setRooms(updatedRooms);
      localStorage.setItem('tripRooms', JSON.stringify(updatedRooms));
      
      // Удаляем также все поездки этой комнаты
      localStorage.removeItem(`trips_${roomId}`);
    }
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route 
            path="/" 
            element={
              <RoomList 
                rooms={rooms} 
                onAddRoom={addRoom} 
                onDeleteRoom={deleteRoom}
              />
            } 
          />
          <Route 
            path="/room/:roomId" 
            element={
              <TripRoom 
                rooms={rooms}
                onUpdateRoomStats={updateRoomStats}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;