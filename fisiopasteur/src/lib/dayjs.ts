import dayjsLib, { type ConfigType, type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";

export const ARG_TIMEZONE = "America/Argentina/Buenos_Aires";

dayjsLib.extend(customParseFormat);
dayjsLib.extend(localizedFormat);
dayjsLib.extend(utc);
dayjsLib.extend(timezone);
dayjsLib.locale("es");
dayjsLib.tz.setDefault(ARG_TIMEZONE);

export const dayjs = dayjsLib;

export const now = (): Dayjs => dayjs.tz();
export const nowIso = (): string => now().toISOString();
export const todayYmd = (): string => now().format("YYYY-MM-DD");

export const parseYmd = (value: string): Dayjs =>
  dayjs(value, "YYYY-MM-DD", true).tz(ARG_TIMEZONE, true);
export const parseYmdHm = (fecha: string, hora: string): Dayjs => {
  const horaNormalizada = hora.trim().slice(0, 8);
  const fechaHoraConSegundos = `${fecha} ${horaNormalizada}`;
  const fechaHoraSinSegundos = `${fecha} ${horaNormalizada.slice(0, 5)}`;

  const parsedWithSeconds = dayjs(fechaHoraConSegundos, "YYYY-MM-DD HH:mm:ss", true);
  if (parsedWithSeconds.isValid()) {
    return parsedWithSeconds.tz(ARG_TIMEZONE, true);
  }

  return dayjs(fechaHoraSinSegundos, "YYYY-MM-DD HH:mm", true).tz(ARG_TIMEZONE, true);
};

export const formatDate = (value: ConfigType, pattern: string): string =>
  dayjs(value).tz(ARG_TIMEZONE).format(pattern);

export const toYmd = (value: ConfigType): string =>
  dayjs(value).tz(ARG_TIMEZONE).format("YYYY-MM-DD");

export const timeToMinutes = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const addMinutesToTime = (hora: string, minutes: number): string =>
  minutesToTime(timeToMinutes(hora) + minutes);

export const isPastDateTime = (fecha: string, hora: string): boolean =>
  parseYmdHm(fecha, hora).isBefore(now());

export const diffMsFromNow = (value: ConfigType): number =>
  now().valueOf() - dayjs(value).tz(ARG_TIMEZONE).valueOf();

export const ageFromBirthdate = (fechaNacimiento: string): number =>
  now().diff(dayjs(fechaNacimiento).tz(ARG_TIMEZONE, true), "year");
