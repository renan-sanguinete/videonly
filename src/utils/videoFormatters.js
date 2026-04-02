export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '—';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function formatDate(dateLike) {
  if (!dateLike) return '—';

  const date = new Date(dateLike);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatVideoDuration(secondsLike) {
  const totalSeconds = Math.max(0, Math.round(secondsLike || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  }

  return [minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
}

export function generateVideoFileName(extension) {
  const now = new Date();

  const pad = n => String(n).padStart(2, '0');

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `video-${year}${month}${day}-${hours}${minutes}${seconds}.${extension}`;
}