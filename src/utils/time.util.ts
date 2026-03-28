export const formatMSToTimeString = (ms: number) => {
  if (ms < 0) return '00:00:00';

  const sec = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / (1000 * 60)) % 60);
  const hour = Math.floor(ms / (1000 * 60 * 60));

  // 10보다 작으면 문자열 0 추가
  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hour)}:${pad(min)}:${pad(sec)}`;
};

export const formatDateString = (date: Date) => {
  const utcDate = new Date(date);

  const kstDate = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(utcDate);

  const formattedDate = kstDate.replace(/\. /g, '-').replace(/\./g, '');

  return formattedDate;
};
