import { computeAllocation } from './payments.service';

describe('computeAllocation', () => {
  it('single payment covers single lesson exactly', () => {
    const result = computeAllocation(
      [{ id: 'p1', amount: 300 }],
      [{ id: 'l1', price: 300, status: 'CONDUCTED' }],
    );
    expect(result).toEqual([
      { paymentId: 'p1', lessonId: 'l1', amount: 300, type: 'DEBT' },
    ]);
  });

  it('payment covers two debt lessons and one prepaid', () => {
    const result = computeAllocation(
      [{ id: 'p1', amount: 900 }],
      [
        { id: 'l1', price: 300, status: 'CONDUCTED' },
        { id: 'l2', price: 300, status: 'CONDUCTED' },
        { id: 'l3', price: 300, status: 'PLANNED' },
      ],
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ paymentId: 'p1', lessonId: 'l1', amount: 300, type: 'DEBT' });
    expect(result[1]).toEqual({ paymentId: 'p1', lessonId: 'l2', amount: 300, type: 'DEBT' });
    expect(result[2]).toEqual({ paymentId: 'p1', lessonId: 'l3', amount: 300, type: 'PREPAID' });
  });

  it('payment less than lesson price — partial coverage', () => {
    const result = computeAllocation(
      [{ id: 'p1', amount: 250 }],
      [{ id: 'l1', price: 300, status: 'CONDUCTED' }],
    );
    expect(result).toEqual([
      { paymentId: 'p1', lessonId: 'l1', amount: 250, type: 'DEBT' },
    ]);
  });

  it('multiple payments split across same lesson', () => {
    const result = computeAllocation(
      [{ id: 'p1', amount: 200 }, { id: 'p2', amount: 100 }],
      [{ id: 'l1', price: 300, status: 'CONDUCTED' }],
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ paymentId: 'p1', lessonId: 'l1', amount: 200, type: 'DEBT' });
    expect(result[1]).toEqual({ paymentId: 'p2', lessonId: 'l1', amount: 100, type: 'DEBT' });
  });

  it('payment exceeds all lessons — surplus not allocated', () => {
    const result = computeAllocation(
      [{ id: 'p1', amount: 500 }],
      [{ id: 'l1', price: 300, status: 'CONDUCTED' }],
    );
    expect(result).toEqual([
      { paymentId: 'p1', lessonId: 'l1', amount: 300, type: 'DEBT' },
    ]);
  });

  it('payment crosses lesson boundary — second payment continues where first left off', () => {
    const result = computeAllocation(
      [{ id: 'p1', amount: 200 }, { id: 'p2', amount: 400 }],
      [
        { id: 'l1', price: 300, status: 'CONDUCTED' },
        { id: 'l2', price: 300, status: 'CONDUCTED' },
      ],
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ paymentId: 'p1', lessonId: 'l1', amount: 200, type: 'DEBT' });
    expect(result[1]).toEqual({ paymentId: 'p2', lessonId: 'l1', amount: 100, type: 'DEBT' });
    expect(result[2]).toEqual({ paymentId: 'p2', lessonId: 'l2', amount: 300, type: 'DEBT' });
  });

  it('no payments returns empty array', () => {
    expect(computeAllocation([], [{ id: 'l1', price: 300, status: 'CONDUCTED' }])).toEqual([]);
  });

  it('no lessons returns empty array', () => {
    expect(computeAllocation([{ id: 'p1', amount: 300 }], [])).toEqual([]);
  });
});
