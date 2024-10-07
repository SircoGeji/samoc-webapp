import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from '../constants';

export const formatDateTime = (dateStr, timeStr?) => {
  // const mTime = timeStr ? moment(timeStr, ['h:m A']) : moment().endOf('day');
  // Phase 2, always default to 11:59 PM
  const formattedStr = moment(dateStr).format('yyyy-MM-DD') + ' 23:59:59';
  const m = moment.tz(formattedStr, DEFAULT_TIMEZONE);
  return m.toISOString();
};

export const getServerDateTime = (isoDateStr: string, type: string) => {
  const m = moment(isoDateStr);
  const n = m.clone().tz(DEFAULT_TIMEZONE);
  if (type.toLowerCase() === 'date') {
    return n.format('MM.DD.YYYY');
  } else if (type.toLowerCase() === 'time') {
    return n.format('hh:mm A');
  }
};

export const getLocalDateTime = (isoDateStr: string, type: string) => {
  const m = moment(isoDateStr);
  if (type.toLowerCase() === 'date') {
    return m.format('MM.DD.YYYY');
  } else if (type.toLowerCase() === 'time') {
    return m.format('h:mm A');
  }
};

export const getTimeZoneDateTime = (
  isoDateStr: string,
  tz: string,
  type: string,
) => {
  const m = moment(isoDateStr).tz(tz);
  if (type.toLowerCase() === 'date') {
    return m.format('MM.DD.YYYY');
  } else if (type.toLowerCase() === 'time') {
    return m.format('h:mm A');
  }
};
