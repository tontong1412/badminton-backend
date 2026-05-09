import { describe, it, expect, vi, beforeEach } from 'vitest'
import bookingUtils, { calculateTotalPriceWithRules } from '../../src/utils/booking'

// ─── helpers ─────────────────────────────────────────────────────────────────

const {
  timeToMinutes,
  minutesToTime,
  addMinutes,
  calculateDurationMinutes,
  isThirtyMinuteBoundary,
  generateSlots,
  normalizeDate,
  getVenueScheduleForDate,
  validateBookingWindow,
  calculateTotalPrice,
  enumerateRecurringDates,
  checkSlotAvailability,
  validateBookingGap,
} = bookingUtils

// ─── timeToMinutes ────────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('converts midnight to 0', () => expect(timeToMinutes('00:00')).toBe(0))
  it('converts 09:30 to 570', () => expect(timeToMinutes('09:30')).toBe(570))
  it('converts 23:00 to 1380', () => expect(timeToMinutes('23:00')).toBe(1380))
  it('throws on invalid format', () => expect(() => timeToMinutes('abc')).toThrow())
})

// ─── minutesToTime ────────────────────────────────────────────────────────────

describe('minutesToTime', () => {
  it('converts 0 to 00:00', () => expect(minutesToTime(0)).toBe('00:00'))
  it('converts 570 to 09:30', () => expect(minutesToTime(570)).toBe('09:30'))
  it('converts 1380 to 23:00', () => expect(minutesToTime(1380)).toBe('23:00'))
})

// ─── addMinutes ───────────────────────────────────────────────────────────────

describe('addMinutes', () => {
  it('adds 30 to 09:00 → 09:30', () => expect(addMinutes('09:00', 30)).toBe('09:30'))
  it('adds 60 to 22:00 → 23:00', () => expect(addMinutes('22:00', 60)).toBe('23:00'))
  it('adds 0 → unchanged', () => expect(addMinutes('10:00', 0)).toBe('10:00'))
})

// ─── calculateDurationMinutes ─────────────────────────────────────────────────

describe('calculateDurationMinutes', () => {
  it('1 hour → 60', () => expect(calculateDurationMinutes('09:00', '10:00')).toBe(60))
  it('90 min → 90', () => expect(calculateDurationMinutes('09:00', '10:30')).toBe(90))
  it('same time → 0', () => expect(calculateDurationMinutes('10:00', '10:00')).toBe(0))
})

// ─── isThirtyMinuteBoundary ───────────────────────────────────────────────────

describe('isThirtyMinuteBoundary', () => {
  it('09:00 is a boundary', () => expect(isThirtyMinuteBoundary('09:00')).toBe(true))
  it('09:30 is a boundary', () => expect(isThirtyMinuteBoundary('09:30')).toBe(true))
  it('09:15 is not a boundary', () => expect(isThirtyMinuteBoundary('09:15')).toBe(false))
  it('23:00 is a boundary', () => expect(isThirtyMinuteBoundary('23:00')).toBe(true))
})

// ─── generateSlots ────────────────────────────────────────────────────────────

describe('generateSlots', () => {
  describe('30-minute slots (no offset)', () => {
    it('generates correct count', () => {
      const slots = generateSlots('09:00', '23:00', 30)
      expect(slots).toHaveLength(28) // (23:00 - 09:00) / 30 = 28
    })
    it('first slot equals open time', () => {
      expect(generateSlots('09:00', '23:00', 30)[0]).toBe('09:00')
    })
    it('last slot is 30 min before close', () => {
      const slots = generateSlots('09:00', '23:00', 30)
      expect(slots[slots.length - 1]).toBe('22:30')
    })
  })

  describe('60-minute slots (no offset)', () => {
    it('generates on-the-hour slots only', () => {
      const slots = generateSlots('09:00', '23:00', 60)
      expect(slots).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'])
    })
    it('does not include half-past starts', () => {
      expect(generateSlots('09:00', '23:00', 60).every((s) => s.endsWith(':00'))).toBe(true)
    })
  })

  describe('60-minute slots with offset 30', () => {
    it('generates half-past slots only', () => {
      const slots = generateSlots('09:00', '23:00', 60, 30)
      expect(slots.every((s) => s.endsWith(':30'))).toBe(true)
    })
    it('first slot is 09:30', () => {
      expect(generateSlots('09:00', '23:00', 60, 30)[0]).toBe('09:30')
    })
    it('last slot is 21:30 (21:30 + 60 = 22:30 ≤ 23:00)', () => {
      const slots = generateSlots('09:00', '23:00', 60, 30)
      expect(slots[slots.length - 1]).toBe('21:30')
    })
  })

  describe('30-minute slots with offset 30 (same as no offset)', () => {
    it('starts at open time since open itself aligns after adjustment', () => {
      // offset == duration, so offsetInBlock = 0, no shift
      const slots = generateSlots('09:00', '23:00', 30, 30)
      expect(slots[0]).toBe('09:00')
    })
  })

  it('returns empty when window too small', () => {
    expect(generateSlots('09:00', '09:30', 60)).toHaveLength(0)
  })
})

// ─── normalizeDate ────────────────────────────────────────────────────────────

describe('normalizeDate', () => {
  it('strips time component', () => {
    const d = normalizeDate('2026-05-10T15:30:00')
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })
  it('same date string produces equal timestamps', () => {
    expect(normalizeDate('2026-05-10').getTime()).toBe(normalizeDate('2026-05-10T23:59').getTime())
  })
})

// ─── getVenueScheduleForDate ──────────────────────────────────────────────────

describe('getVenueScheduleForDate', () => {
  const weeklySchedule = {
    '0': { open: '10:00', close: '20:00' }, // Sunday
    '1': { open: '09:00', close: '22:00' }, // Monday
  }

  it('returns weekly schedule for a normal Monday', () => {
    // 2026-05-11 is a Monday
    const result = getVenueScheduleForDate({ weeklySchedule }, '2026-05-11')
    expect(result).toEqual({ open: '09:00', close: '22:00' })
  })

  it('returns null for a day not in schedule', () => {
    // 2026-05-12 is Tuesday — not in weeklySchedule
    expect(getVenueScheduleForDate({ weeklySchedule }, '2026-05-12')).toBeNull()
  })

  it('holiday isClosed overrides weekly schedule', () => {
    const holidays = [{ date: new Date('2026-05-11'), isClosed: true }]
    expect(getVenueScheduleForDate({ weeklySchedule, holidays }, '2026-05-11')).toBeNull()
  })

  it('holiday custom hours override weekly schedule', () => {
    const holidays = [{ date: new Date('2026-05-11'), isClosed: false, openTime: '12:00', closeTime: '18:00' }]
    const result = getVenueScheduleForDate({ weeklySchedule, holidays }, '2026-05-11')
    expect(result).toEqual({ open: '12:00', close: '18:00' })
  })
})

// ─── validateBookingWindow ────────────────────────────────────────────────────

describe('validateBookingWindow', () => {
  it('accepts valid 60-min booking', () => {
    expect(() => validateBookingWindow('09:00', '10:00')).not.toThrow()
  })
  it('accepts valid 90-min booking', () => {
    expect(() => validateBookingWindow('09:00', '10:30')).not.toThrow()
  })
  it('throws when start is not on 30-min boundary', () => {
    expect(() => validateBookingWindow('09:15', '10:15')).toThrow()
  })
  it('throws when end is not on 30-min boundary', () => {
    expect(() => validateBookingWindow('09:00', '10:15')).toThrow()
  })
  it('throws when duration < 60 min', () => {
    expect(() => validateBookingWindow('09:00', '09:30')).toThrow()
  })
})

// ─── calculateTotalPrice ──────────────────────────────────────────────────────

describe('calculateTotalPrice', () => {
  it('1 hour at 180/hr → 180', () => expect(calculateTotalPrice(180, 60)).toBe(180))
  it('30 min at 180/hr → 90', () => expect(calculateTotalPrice(180, 30)).toBe(90))
  it('90 min at 200/hr → 300', () => expect(calculateTotalPrice(200, 90)).toBe(300))
  it('rounds to 2 decimal places', () => expect(calculateTotalPrice(100, 45)).toBe(75))
})

// ─── calculateTotalPriceWithRules ─────────────────────────────────────────────

describe('calculateTotalPriceWithRules', () => {
  describe('no pricing rules', () => {
    it('uses flat pricePerHour', () => {
      expect(calculateTotalPriceWithRules({ pricePerHour: 180 }, '10:00', '12:00')).toBe(360)
    })
  })

  describe('booking fully inside one rule', () => {
    const court = {
      pricePerHour: 180,
      pricingRules: [
        { startTime: '09:00', endTime: '16:00', pricePerHour: 150 },
        { startTime: '16:00', endTime: '23:00', pricePerHour: 200 },
      ],
    }
    it('10:00–12:00 → 2h × 150 = 300', () => {
      expect(calculateTotalPriceWithRules(court, '10:00', '12:00')).toBe(300)
    })
    it('18:00–20:00 → 2h × 200 = 400', () => {
      expect(calculateTotalPriceWithRules(court, '18:00', '20:00')).toBe(400)
    })
  })

  describe('booking spanning two rules', () => {
    const court = {
      pricePerHour: 180,
      pricingRules: [
        { startTime: '09:00', endTime: '16:00', pricePerHour: 150 },
        { startTime: '16:00', endTime: '23:00', pricePerHour: 200 },
      ],
    }
    it('14:00–18:00 → 2h@150 + 2h@200 = 700', () => {
      expect(calculateTotalPriceWithRules(court, '14:00', '18:00')).toBe(700)
    })
  })

  describe('booking partially covered by rule (gap uses fallback)', () => {
    const court = {
      pricePerHour: 180,
      pricingRules: [
        { startTime: '16:00', endTime: '23:00', pricePerHour: 200 },
      ],
    }
    it('10:00–18:00 → 6h@180 + 2h@200 = 1480', () => {
      // 10:00–16:00 (360 min) @ fallback 180 → 6×180 = 1080
      // 16:00–18:00 (120 min) @ 200 → 2×200 = 400
      expect(calculateTotalPriceWithRules(court, '10:00', '18:00')).toBe(1480)
    })
  })

  describe('30-minute slot in tiered pricing', () => {
    const court = {
      pricePerHour: 180,
      pricingRules: [
        { startTime: '09:00', endTime: '16:00', pricePerHour: 150 },
        { startTime: '16:00', endTime: '23:00', pricePerHour: 200 },
      ],
    }
    it('09:00–09:30 → 30min@150 = 75', () => {
      expect(calculateTotalPriceWithRules(court, '09:00', '09:30')).toBe(75)
    })
  })
})

// ─── enumerateRecurringDates ──────────────────────────────────────────────────

describe('enumerateRecurringDates', () => {
  it('daily pattern returns every day in range', () => {
    const dates = enumerateRecurringDates('daily', new Date('2026-05-01'), new Date('2026-05-05'))
    expect(dates).toHaveLength(5)
  })

  it('weekly pattern with daysOfWeek filters correctly', () => {
    // 2026-05-11 is Monday (1), 2026-05-12 is Tuesday (2)
    const dates = enumerateRecurringDates('weekly', new Date('2026-05-11'), new Date('2026-05-25'), [1, 3])
    // Mon 11 May, Wed 13 May, Mon 18 May, Wed 20 May, Mon 25 May = 5 dates
    expect(dates).toHaveLength(5)
    dates.forEach((d) => expect([1, 3]).toContain(d.getDay()))
  })

  it('weekly with no matching days returns empty', () => {
    // 2026-05-11 Monday to 2026-05-15 Friday — request only Sunday (0)
    const dates = enumerateRecurringDates('weekly', new Date('2026-05-11'), new Date('2026-05-15'), [0])
    expect(dates).toHaveLength(0)
  })

  it('start == end returns single date for daily', () => {
    const dates = enumerateRecurringDates('daily', new Date('2026-05-10'), new Date('2026-05-10'))
    expect(dates).toHaveLength(1)
  })
})

// ─── checkSlotAvailability (mocked DB) ───────────────────────────────────────

describe('checkSlotAvailability', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns available when no bookings exist', async() => {
    vi.doMock('../../src/schema/booking', () => ({
      default: { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }) }) },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.checkSlotAvailability('courtId', new Date('2026-05-10'), '10:00', '12:00')
    expect(result.available).toBe(true)
  })

  it('returns unavailable when booking overlaps', async() => {
    const existingBooking = { startTime: '11:00', endTime: '13:00', id: 'b1' }
    vi.doMock('../../src/schema/booking', () => ({
      default: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([existingBooking]) }),
        }),
      },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.checkSlotAvailability('courtId', new Date('2026-05-10'), '10:00', '12:00')
    expect(result.available).toBe(false)
    expect(result.conflict).toBe('11:00-13:00')
  })

  it('returns available when adjacent booking does not overlap', async() => {
    const existingBooking = { startTime: '12:00', endTime: '14:00', id: 'b1' }
    vi.doMock('../../src/schema/booking', () => ({
      default: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([existingBooking]) }),
        }),
      },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.checkSlotAvailability('courtId', new Date('2026-05-10'), '10:00', '12:00')
    expect(result.available).toBe(true)
  })
})

// ─── validateBookingGap (mocked DB) ──────────────────────────────────────────

describe('validateBookingGap', () => {
  const gapPolicy = { enabled: true, minimumGapMinutes: 60 }
  const disabledPolicy = { enabled: false, minimumGapMinutes: 60 }

  beforeEach(() => {
    vi.resetModules()
  })

  it('skips validation when gap policy disabled', async() => {
    vi.doMock('../../src/schema/booking', () => ({
      default: { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }) }) },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.validateBookingGap('c', new Date(), '09:00', '10:00', disabledPolicy, '09:00', '23:00')
    expect(result.valid).toBe(true)
  })

  it('valid when new booking leaves 60-min gap against existing', async() => {
    // Existing: 11:00–13:00. New: 09:00–10:00. Gap = 11:00 - 10:00 = 60 min ✓
    const existing = [{ startTime: '11:00', endTime: '13:00', id: 'b1' }]
    vi.doMock('../../src/schema/booking', () => ({
      default: { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(existing) }) }) },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.validateBookingGap('c', new Date(), '09:00', '10:00', gapPolicy, '09:00', '23:00')
    expect(result.valid).toBe(true)
  })

  it('invalid when gap is below minimum', async() => {
    // Existing: 11:00–13:00. New: 09:00–10:30. Gap = 11:00 - 10:30 = 30 min < 60 ✗
    const existing = [{ startTime: '11:00', endTime: '13:00', id: 'b1' }]
    vi.doMock('../../src/schema/booking', () => ({
      default: { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(existing) }) }) },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.validateBookingGap('c', new Date(), '09:00', '10:30', gapPolicy, '09:00', '23:00')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/30-minute gap/)
  })

  it('invalid when trailing gap before close is below minimum', async() => {
    // New: 21:30–22:30. Close: 23:00. Trailing gap = 30 min < 60 ✗
    vi.doMock('../../src/schema/booking', () => ({
      default: { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }) }) },
    }))
    const { default: utils } = await import('../../src/utils/booking')
    const result = await utils.validateBookingGap('c', new Date(), '21:30', '22:30', gapPolicy, '09:00', '23:00')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/gap before closing/)
  })
})
