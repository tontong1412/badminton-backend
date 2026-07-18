import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import RecurringGroupModel from '../../src/schema/recurringGroup'

describe('RecurringGroup schema backward compatibility', () => {
  it('accepts legacy multi-hour durationMinutes values', () => {
    const doc = new RecurringGroupModel({
      courtID: new Types.ObjectId(),
      startTime: '20:00',
      endTime: '22:00',
      durationMinutes: 120,
      pattern: 'weekly',
      daysOfWeek: [1, 3],
      rangeStart: new Date('2026-07-20'),
      rangeEnd: new Date('2026-08-20'),
      userID: new Types.ObjectId(),
      bookingIDs: [],
    })

    const validationError = doc.validateSync()
    expect(validationError).toBeUndefined()
  })

  it('rejects durationMinutes values below 30', () => {
    const doc = new RecurringGroupModel({
      courtID: new Types.ObjectId(),
      startTime: '20:00',
      endTime: '22:00',
      durationMinutes: 20,
      pattern: 'weekly',
      daysOfWeek: [1],
      rangeStart: new Date('2026-07-20'),
      rangeEnd: new Date('2026-08-20'),
      userID: new Types.ObjectId(),
      bookingIDs: [],
    })

    const validationError = doc.validateSync()
    expect(validationError).toBeDefined()
    expect(validationError?.errors.durationMinutes).toBeDefined()
  })
})
