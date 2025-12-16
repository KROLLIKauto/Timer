export const calculateTimeDifference = (currentTrip, previousTrip) => {
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

export const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};