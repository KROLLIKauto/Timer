import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AddRoomModal from '../AddRoomModal/AddRoomModal';
import './RoomList.css';

const RoomList = ({ rooms, onAddRoom, onDeleteRoom }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Фильтрация комнат по поиску
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRoom = (roomName) => {
    onAddRoom(roomName);
    setShowAddModal(false);
  };

  // Форматирование даты создания
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="room-list-container">
      <header className="room-list-header">
        <h1>🚗 Трекер времени поездок</h1>
        <p className="app-description">
          Создавайте поездки, отслеживайте время на участках и сравнивайте результаты
        </p>
      </header>

      <div className="room-controls">
        <button 
          className="add-room-btn"
          onClick={() => setShowAddModal(true)}
        >
          <span className="btn-icon">+</span>
          Добавить поездку
        </button>

        <div className="search-container">
          <input
            type="text"
            placeholder="Поиск поездок..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="rooms-grid">
        {filteredRooms.length > 0 ? (
          filteredRooms.map(room => (
            <div key={room.id} className="room-card">
              <Link to={`/room/${room.id}`} className="room-link">
                <div className="room-header">
                  <h3 className="room-name">{room.name}</h3>
                  <span className="room-status">
                    {room.tripCount > 0 ? '📊 Есть данные' : '🆕 Новая'}
                  </span>
                </div>
                
                <div className="room-stats">
                  <div className="stat">
                    <span className="stat-label">Поездок:</span>
                    <span className="stat-value">{room.tripCount}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Создана:</span>
                    <span className="stat-value">{formatDate(room.createdAt)}</span>
                  </div>
                  {room.lastTripDate && (
                    <div className="stat">
                      <span className="stat-label">Последняя:</span>
                      <span className="stat-value">{room.lastTripDate}</span>
                    </div>
                  )}
                </div>
              </Link>
              
              <div className="room-actions">
                <Link to={`/room/${room.id}`} className="enter-room-btn">
                  Открыть →
                </Link>
                <button 
                  className="delete-room-btn"
                  onClick={() => onDeleteRoom(room.id)}
                  title="Удалить поездку"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-rooms-message">
            <div className="no-rooms-icon">🚗</div>
            <h3>Пока нет поездок</h3>
            <p>Создайте первую поездку, чтобы начать отслеживать время</p>
            <button 
              className="create-first-room-btn"
              onClick={() => setShowAddModal(true)}
            >
              Создать первую поездку
            </button>
          </div>
        )}
      </div>

      {filteredRooms.length > 0 && (
        <div className="rooms-stats">
          <div className="stat-card">
            <span className="stat-card-label">Всего поездок:</span>
            <span className="stat-card-value">{rooms.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Всего записей:</span>
            <span className="stat-card-value">
              {rooms.reduce((sum, room) => sum + room.tripCount, 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Активных:</span>
            <span className="stat-card-value">
              {rooms.filter(room => room.tripCount > 0).length}
            </span>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddRoomModal
          onClose={() => setShowAddModal(false)}
          onAddRoom={handleAddRoom}
        />
      )}
    </div>
  );
};

export default RoomList;