const DEFAULT_SERIES_DAYS = 7;

const pad = (value) => String(value).padStart(2, "0");

export const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())}`;
};

export const getLocalDateOnly = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const buildRecentDateRange = (
  days = DEFAULT_SERIES_DAYS,
  endDate = getLocalDateOnly()
) => {
  const [year, month, day] = String(endDate).split("-").map(Number);
  const rangeEnd = new Date(year, month - 1, day);

  return Array.from({ length: days }, (_, index) => {
    const currentDate = new Date(rangeEnd);
    currentDate.setDate(rangeEnd.getDate() - (days - index - 1));

    return getLocalDateOnly(currentDate);
  });
};

const countItemsBeforeDate = (items, dateAccessor, predicate, startDate) =>
  items.reduce((count, item) => {
    if (!predicate(item)) {
      return count;
    }

    const itemDate = normalizeDateOnly(dateAccessor(item));

    if (itemDate && itemDate < startDate) {
      return count + 1;
    }

    return count;
  }, 0);

const buildDailyCountMap = (items, dateAccessor, predicate) =>
  items.reduce((dailyCountMap, item) => {
    if (!predicate(item)) {
      return dailyCountMap;
    }

    const itemDate = normalizeDateOnly(dateAccessor(item));

    if (!itemDate) {
      return dailyCountMap;
    }

    dailyCountMap.set(itemDate, (dailyCountMap.get(itemDate) || 0) + 1);
    return dailyCountMap;
  }, new Map());

export const buildCumulativeSeries = ({
  items = [],
  dateAccessor,
  predicate = () => true,
  range = buildRecentDateRange(),
}) => {
  const startDate = range[0];
  const baselineCount = countItemsBeforeDate(items, dateAccessor, predicate, startDate);
  const dailyCountMap = buildDailyCountMap(items, dateAccessor, predicate);
  let runningTotal = baselineCount;

  return range.map((date) => {
    runningTotal += dailyCountMap.get(date) || 0;
    return runningTotal;
  });
};

export const buildCumulativeRatioSeries = ({
  numeratorItems = [],
  numeratorDateAccessor,
  numeratorPredicate = () => true,
  denominatorItems = [],
  denominatorDateAccessor,
  denominatorPredicate = () => true,
  range = buildRecentDateRange(),
}) => {
  const startDate = range[0];
  const numeratorBaseline = countItemsBeforeDate(
    numeratorItems,
    numeratorDateAccessor,
    numeratorPredicate,
    startDate
  );
  const denominatorBaseline = countItemsBeforeDate(
    denominatorItems,
    denominatorDateAccessor,
    denominatorPredicate,
    startDate
  );
  const numeratorDailyMap = buildDailyCountMap(
    numeratorItems,
    numeratorDateAccessor,
    numeratorPredicate
  );
  const denominatorDailyMap = buildDailyCountMap(
    denominatorItems,
    denominatorDateAccessor,
    denominatorPredicate
  );

  let runningNumerator = numeratorBaseline;
  let runningDenominator = denominatorBaseline;

  return range.map((date) => {
    runningNumerator += numeratorDailyMap.get(date) || 0;
    runningDenominator += denominatorDailyMap.get(date) || 0;

    if (runningDenominator <= 0) {
      return 0;
    }

    return Math.round((runningNumerator / runningDenominator) * 100);
  });
};
