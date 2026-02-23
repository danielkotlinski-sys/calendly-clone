import {
  generateTimeSlots,
  formatDate,
  getDayOfWeek,
  isPastDate,
  isValidEmail,
  isValidUsername,
  getDayName,
  getShortDayName,
} from '@/lib/utils';

describe('generateTimeSlots', () => {
  it('generuje sloty co 30 minut między 9:00 a 11:00', () => {
    const slots = generateTimeSlots('09:00', '11:00', 30);
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('generuje sloty co 60 minut między 9:00 a 17:00', () => {
    const slots = generateTimeSlots('09:00', '17:00', 60);
    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe('09:00');
    expect(slots[7]).toBe('16:00');
  });

  it('generuje sloty co 15 minut', () => {
    const slots = generateTimeSlots('09:00', '10:00', 15);
    expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });

  it('zwraca pusty array gdy slot nie mieści się w przedziale', () => {
    const slots = generateTimeSlots('09:00', '09:20', 30);
    expect(slots).toEqual([]);
  });

  it('generuje dokładnie jeden slot gdy czas trwania = przedział', () => {
    const slots = generateTimeSlots('09:00', '09:30', 30);
    expect(slots).toEqual(['09:00']);
  });

  it('poprawnie obsługuje minuty niezaokrąglone do pełnych godzin', () => {
    const slots = generateTimeSlots('09:30', '11:00', 30);
    expect(slots).toEqual(['09:30', '10:00', '10:30']);
  });
});

describe('formatDate', () => {
  it('formatuje datę do YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 15); // 15 stycznia 2026
    expect(formatDate(date)).toBe('2026-01-15');
  });

  it('dodaje zero wiodące do miesiąca i dnia', () => {
    const date = new Date(2026, 2, 5); // 5 marca 2026
    expect(formatDate(date)).toBe('2026-03-05');
  });
});

describe('getDayOfWeek', () => {
  it('zwraca 1 dla poniedziałku', () => {
    expect(getDayOfWeek('2026-02-23')).toBe(1); // poniedziałek
  });

  it('zwraca 0 dla niedzieli', () => {
    expect(getDayOfWeek('2026-02-22')).toBe(0); // niedziela
  });

  it('zwraca 5 dla piątku', () => {
    expect(getDayOfWeek('2026-02-27')).toBe(5); // piątek
  });
});

describe('isPastDate', () => {
  it('zwraca true dla daty z przeszłości', () => {
    expect(isPastDate('2020-01-01')).toBe(true);
  });

  it('zwraca false dla daty w przyszłości', () => {
    expect(isPastDate('2030-12-31')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('akceptuje poprawny email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.pl')).toBe(true);
  });

  it('odrzuca niepoprawny email', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidUsername', () => {
  it('akceptuje poprawny username', () => {
    expect(isValidUsername('daniel')).toBe(true);
    expect(isValidUsername('daniel-kotlinski')).toBe(true);
    expect(isValidUsername('user123')).toBe(true);
  });

  it('odrzuca username z niedozwolonymi znakami', () => {
    expect(isValidUsername('Daniel')).toBe(false); // wielka litera
    expect(isValidUsername('daniel kotlinski')).toBe(false); // spacja
    expect(isValidUsername('daniel.kotlinski')).toBe(false); // kropka
    expect(isValidUsername('')).toBe(false);
  });
});

describe('getDayName', () => {
  it('zwraca polskie nazwy dni tygodnia', () => {
    expect(getDayName(0)).toBe('Niedziela');
    expect(getDayName(1)).toBe('Poniedziałek');
    expect(getDayName(5)).toBe('Piątek');
    expect(getDayName(6)).toBe('Sobota');
  });
});

describe('getShortDayName', () => {
  it('zwraca skrócone polskie nazwy dni tygodnia', () => {
    expect(getShortDayName(0)).toBe('Ndz');
    expect(getShortDayName(1)).toBe('Pon');
    expect(getShortDayName(5)).toBe('Pt');
  });
});
