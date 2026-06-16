const DEFAULT_GO2RTC_URL = "http://localhost:1984";

const normalizeBaseUrl = (url: string) =>
  url.endsWith("/") ? url.slice(0, -1) : url;

export const getGo2RtcBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_GO2RTC_URL || DEFAULT_GO2RTC_URL;
  return normalizeBaseUrl(baseUrl);
};

export const getPrinterStreamName = (printerLabel: string) => {
  if (!printerLabel) return null;
  const hashMatch = printerLabel.match(/#\s*(\d{1,3})/);
  const numberMatch = printerLabel.match(/\b(\d{1,3})\b/);
  const raw = (hashMatch || numberMatch)?.[1];
  if (!raw) return null;
  const padded = raw.padStart(2, "0");
  return `printer_${padded}`;
};

export const getStreamMp4Url = (streamName: string) =>
  `${getGo2RtcBaseUrl()}/api/stream.mp4?src=${encodeURIComponent(streamName)}`;

export const getStreamHlsUrl = (streamName: string) =>
  `${getGo2RtcBaseUrl()}/api/stream.m3u8?src=${encodeURIComponent(streamName)}`;
