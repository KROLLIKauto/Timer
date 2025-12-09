import React, { useState, useRef, useEffect } from 'react';
import './AddRoomModal.css';

const AddRoomModal = ({ onClose, onAddRoom }) => {
  const [roomName, setRoomName] = useState('');
  const modalRef = useRef();
  const inputRef = useRef();

  // Примеры названий поездок
  const examples = [
    "Ростов-Москва",
    "Сочи-Краснодар",
    "Дом-Работа",
    "Город-Дача",
    "Маршрут выходного дня"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      onAddRoom(roomName.trim());
    }
  };

  const handleExampleClick = (example) => {
    setRoomName(example);
    inputRef.current.focus();
  };

  // Закрытие по клику вне модалки
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Фокус на инпуте при открытии
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef}>
        <div className="modal-header">
          <h2>Создать новую поездку</h2>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="roomName">Название поездки:</label>
            <input
              ref={inputRef}
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Например: Ростов-Москва"
              maxLength={50}
              required
            />
            <div className="char-count">{roomName.length}/50</div>
          </div>

          <div className="examples-section">
            <p className="examples-label">Или выберите пример:</p>
            <div className="examples-grid">
              {examples.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  className="example-btn"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onClose}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={!roomName.trim()}
            >
              Создать поездку
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;