import dayjsLib from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";

export const ARG_TIMEZONE = "America/Argentina/Buenos_Aires";

dayjsLib.extend(customParseFormat);
dayjsLib.extend(utc);
dayjsLib.extend(timezone);
dayjsLib.locale("es");
dayjsLib.tz.setDefault(ARG_TIMEZONE);

export const dayjs = dayjsLib;
export const nowIso = (): string => dayjs.tz().toISOString();
