import {
  getPeriodRange,
  getPrevPeriodRange,
  buildChartSkeleton,
  getLessonGroupKey,
} from './dashboard.service';

describe('getPeriodRange', () => {
  it('month: starts on 1st of current month at midnight', () => {
    const { start, end } = getPeriodRange('month');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getMonth()).toBe((now.getMonth() + 1) % 12);
    expect(end.getDate()).toBe(1);
  });

  it('year: starts Jan 1 of current year, ends Jan 1 next year', () => {
    const { start, end } = getPeriodRange('year');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(now.getFullYear() + 1);
    expect(end.getMonth()).toBe(0);
  });

  it('week: start is Monday', () => {
    const { start, end } = getPeriodRange('week');
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    const diffMs = end.getTime() - start.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('getPrevPeriodRange', () => {
  it('month: previous calendar month', () => {
    const { start, end } = getPrevPeriodRange('month');
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    expect(start.getMonth()).toBe(prevMonth);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(now.getMonth());
    expect(end.getDate()).toBe(1);
  });

  it('year: previous calendar year', () => {
    const { start, end } = getPrevPeriodRange('year');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear() - 1);
    expect(end.getFullYear()).toBe(now.getFullYear());
  });

  it('week: 7 days ending on current week Monday', () => {
    const { start, end } = getPrevPeriodRange('week');
    expect(end.getDay()).toBe(1);
    const diffMs = end.getTime() - start.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('buildChartSkeleton', () => {
  it('week: 7 points, all zeroed', () => {
    const monday = new Date(2026, 3, 20); // Mon Apr 20 2026
    const points = buildChartSkeleton('week', monday);
    expect(points).toHaveLength(7);
    points.forEach((p) => {
      expect(p.conducted).toBe(0);
      expect(p.cancelled).toBe(0);
      expect(p.planned).toBe(0);
      expect(p.rescheduled).toBe(0);
    });
  });

  it('year: 12 points with Ukrainian month names', () => {
    const points = buildChartSkeleton('year', new Date(2026, 0, 1));
    expect(points).toHaveLength(12);
    expect(points[0].label).toBe('Січ');
    expect(points[11].label).toBe('Груд');
  });
});

describe('getLessonGroupKey', () => {
  it('year: returns Ukrainian month abbreviation', () => {
    const date = new Date(2026, 3, 15); // April
    expect(getLessonGroupKey(date, 'year')).toBe('Квіт');
  });

  it('month: returns Тиж. N based on day', () => {
    expect(getLessonGroupKey(new Date(2026, 3, 1), 'month')).toBe('Тиж. 1');
    expect(getLessonGroupKey(new Date(2026, 3, 7), 'month')).toBe('Тиж. 1');
    expect(getLessonGroupKey(new Date(2026, 3, 8), 'month')).toBe('Тиж. 2');
    expect(getLessonGroupKey(new Date(2026, 3, 28), 'month')).toBe('Тиж. 4');
  });
});
