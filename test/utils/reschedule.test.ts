/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Types } from 'mongoose'
import reschedule from '../../src/controllers/bookings/reschedule'
import BookingModel from '../../src/schema/booking'
import CourtModel from '../../src/schema/court'
import VenueModel from '../../src/schema/venue'
import bookingUtils from '../../src/utils/booking'
import requestUserUtils from '../../src/utils/requestUser'
import { BookingStatus, UserRole } from '../../src/type'

// Mock the dependencies
vi.mock('../../src/schema/booking')
vi.mock('../../src/schema/court')
vi.mock('../../src/schema/venue')
vi.mock('../../src/utils/booking')
vi.mock('../../src/utils/requestUser')

describe('Reschedule Controller', () => {
  let mockReq: any
  let mockRes: any
  let mockBooking: any
  let mockSwapTarget: any
  let mockCourt: any
  let mockVenue: any
  let mockCurrentUser: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock response object
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    // Mock current user
    mockCurrentUser = {
      id: new Types.ObjectId().toString(),
      role: UserRole.Admin,
    }

    // Mock booking objects
    mockBooking = {
      id: new Types.ObjectId(),
      _id: new Types.ObjectId(),
      courtID: new Types.ObjectId(),
      date: new Date('2024-06-10'),
      startTime: '10:00',
      endTime: '11:00',
      status: BookingStatus.Pending,
      durationMinutes: 60,
      bookingBundleID: null,
      save: vi.fn().mockResolvedValue(null),
    }

    mockSwapTarget = {
      id: new Types.ObjectId(),
      _id: new Types.ObjectId(),
      courtID: new Types.ObjectId(),
      date: new Date('2024-06-10'),
      startTime: '14:00',
      endTime: '15:00',
      status: BookingStatus.Pending,
      durationMinutes: 60,
      bookingBundleID: null,
      save: vi.fn().mockResolvedValue(null),
    }

    // Mock court objects
    mockCourt = {
      id: new Types.ObjectId(),
      _id: new Types.ObjectId(),
      name: 'Court 1',
      status: 'active',
      venueID: new Types.ObjectId(),
    }

    // Mock venue
    mockVenue = {
      id: new Types.ObjectId(),
      _id: new Types.ObjectId(),
      ownerUserID: mockCurrentUser.id,
      managerUserIDs: [],
      weeklySchedule: {
        '0': { open: '09:00', close: '23:00' },
        '1': { open: '09:00', close: '23:00' },
        '2': { open: '09:00', close: '23:00' },
        '3': { open: '09:00', close: '23:00' },
        '4': { open: '09:00', close: '23:00' },
        '5': { open: '09:00', close: '23:00' },
        '6': { open: '09:00', close: '23:00' },
      },
      holidays: [],
    }

    // Mock request
    mockReq = {
      params: { id: mockBooking.id.toString() },
      body: {
        date: '2024-06-10',
        startTime: '11:00',
        endTime: '12:00',
      },
      cookies: {},
    }

    // Setup default mocks
    vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(mockCurrentUser)
    vi.mocked(BookingModel.findById).mockResolvedValue(mockBooking)
    vi.mocked(CourtModel.findById).mockResolvedValue(mockCourt)
    vi.mocked(VenueModel.findById).mockResolvedValue(mockVenue)
    vi.mocked(bookingUtils.normalizeDate).mockImplementation((date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    })
    vi.mocked(bookingUtils.timeToMinutes).mockImplementation((time: string) => {
      if (!time) return 0
      const parts = time.split(':').map(Number)
      const [h, m] = parts
      return (h ?? 0) * 60 + (m ?? 0)
    })
    vi.mocked(bookingUtils.calculateDurationMinutes).mockReturnValue(60)
    vi.mocked(bookingUtils.getVenueScheduleForDate).mockReturnValue({ open: '09:00', close: '23:00' })
    vi.mocked(bookingUtils.validateBookingWindow).mockImplementation(() => {})
    vi.mocked(bookingUtils.checkSlotAvailability).mockResolvedValue({ available: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async() => {
      vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(null)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' })
    })
  })

  describe('Authorization', () => {
    it('should return 403 if user is not owner or manager', async() => {
      mockCurrentUser.role = UserRole.User
      mockVenue.ownerUserID = new Types.ObjectId().toString()
      mockVenue.managerUserIDs = []
      vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(mockCurrentUser)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden' })
    })

    it('should allow system admin regardless of ownership', async() => {
      mockCurrentUser.role = UserRole.Admin
      mockVenue.ownerUserID = new Types.ObjectId().toString()
      vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(mockCurrentUser)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).not.toHaveBeenCalledWith(403)
    })

    it('should allow venue owner', async() => {
      mockCurrentUser.role = UserRole.User
      mockVenue.ownerUserID = mockCurrentUser.id
      vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(mockCurrentUser)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).not.toHaveBeenCalledWith(403)
    })

    it('should allow venue manager', async() => {
      mockCurrentUser.role = UserRole.User
      mockVenue.ownerUserID = new Types.ObjectId().toString()
      mockVenue.managerUserIDs = [mockCurrentUser.id]
      vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(mockCurrentUser)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).not.toHaveBeenCalledWith(403)
    })
  })

  describe('Input Validation', () => {
    it('should return 400 if booking not found', async() => {
      vi.mocked(BookingModel.findById).mockResolvedValue(null)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Booking not found' })
    })

    it('should return 409 if booking is cancelled', async() => {
      mockBooking.status = BookingStatus.Cancelled
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Cannot reschedule a cancelled booking.' })
    })

    it('should return 404 if source court not found', async() => {
      vi.mocked(CourtModel.findById).mockResolvedValueOnce(null)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Source court not found' })
    })

    it('should return 400 if startTime or endTime missing', async() => {
      mockReq.body.startTime = undefined
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'startTime and endTime are required.' })
    })

    it('should return 404 if target court not found', async() => {
      vi.mocked(CourtModel.findById).mockResolvedValueOnce(mockCourt).mockResolvedValueOnce(null)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 if target venue not found', async() => {
      vi.mocked(VenueModel.findById).mockResolvedValue(null)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Target venue not found' })
    })
  })

  describe('Swap Mode', () => {
    it('should swap two bookings of equal duration', async() => {
      mockReq.body.swapWithBookingID = mockSwapTarget.id.toString()

      // Save original values
      const origBookingCourt = mockBooking.courtID
      const origBookingDate = mockBooking.date
      const origBookingStart = mockBooking.startTime
      const origBookingEnd = mockBooking.endTime
      const origTargetCourt = mockSwapTarget.courtID
      const origTargetDate = mockSwapTarget.date
      const origTargetStart = mockSwapTarget.startTime
      const origTargetEnd = mockSwapTarget.endTime

      vi.mocked(BookingModel.findById)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockSwapTarget)

      await reschedule(mockReq, mockRes)

      // Verify bookings were swapped
      expect(mockBooking.courtID).toBe(origTargetCourt)
      expect(mockBooking.date).toBe(origTargetDate)
      expect(mockBooking.startTime).toBe(origTargetStart)
      expect(mockBooking.endTime).toBe(origTargetEnd)

      expect(mockSwapTarget.courtID).toBe(origBookingCourt)
      expect(mockSwapTarget.date).toBe(origBookingDate)
      expect(mockSwapTarget.startTime).toBe(origBookingStart)
      expect(mockSwapTarget.endTime).toBe(origBookingEnd)

      expect(mockBooking.save).toHaveBeenCalled()
      expect(mockSwapTarget.save).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalled()
    })

    it('should return 404 if swap target not found', async() => {
      mockReq.body.swapWithBookingID = new Types.ObjectId().toString()
      vi.mocked(BookingModel.findById)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(null)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Swap target booking not found.' })
    })

    it('should return 400 if swap target has different duration', async() => {
      mockSwapTarget.durationMinutes = 90
      mockReq.body.swapWithBookingID = mockSwapTarget.id.toString()
      vi.mocked(BookingModel.findById)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockSwapTarget)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Can only swap bookings with equal duration.' })
    })

    it('should return 404 if swap target is cancelled', async() => {
      mockSwapTarget.status = BookingStatus.Cancelled
      mockReq.body.swapWithBookingID = mockSwapTarget.id.toString()
      vi.mocked(BookingModel.findById)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockSwapTarget)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
    })
  })

  describe('Single Booking Move', () => {
    it('should return 400 if duration changes', async() => {
      vi.mocked(bookingUtils.calculateDurationMinutes).mockReturnValue(90)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Duration cannot be changed when moving a booking.' })
    })

    it('should return 400 if venue is closed on target date', async() => {
      vi.mocked(bookingUtils.getVenueScheduleForDate).mockReturnValue(null)
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Venue is closed on the selected date.' })
    })

    it('should return 400 if booking outside venue hours', async() => {
      mockReq.body.startTime = '08:00'
      mockReq.body.endTime = '09:00'
      vi.mocked(bookingUtils.timeToMinutes).mockImplementation((time) => {
        const timeMap: Record<string, number> = {
          '08:00': 480,
          '09:00': 540,
          '23:00': 1380,
        }
        if (timeMap[time]) return timeMap[time]
        const [h, m] = (time ?? '').split(':').map(Number)
        return (h ?? 0) * 60 + (m ?? 0)
      })
      vi.mocked(bookingUtils.calculateDurationMinutes).mockReturnValue(60)

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 409 if target slot is unavailable', async() => {
      vi.mocked(bookingUtils.checkSlotAvailability).mockResolvedValue({ available: false, conflict: '12:00-13:00' })
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Target slot is already booked.' })
    })

    it('should successfully move a single booking', async() => {
      vi.mocked(bookingUtils.checkSlotAvailability).mockResolvedValue({ available: true })
      await reschedule(mockReq, mockRes)

      expect(mockBooking.save).toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith(mockBooking)
    })
  })

  describe('Bundle Move', () => {
    beforeEach(() => {
      mockBooking.bookingBundleID = new Types.ObjectId()
      mockReq.body.applyToBundle = true
    })

    it('should return 404 if bundle has no bookings', async() => {
      vi.mocked(BookingModel.find).mockResolvedValue([])
      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Booking bundle not found' })
    })

    it('should return 400 if bundle move results in invalid time range', async() => {
      const bundleBooking = { ...mockBooking, startTime: '23:00', endTime: '23:30' }
      vi.mocked(BookingModel.find).mockResolvedValue([bundleBooking])
      vi.mocked(bookingUtils.timeToMinutes).mockImplementation((time) => {
        if (time === '23:00') return 1380
        if (time === '23:30') return 1410
        return 0
      })
      mockReq.body.startTime = '23:30'
      mockReq.body.endTime = '23:59'

      await reschedule(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Bundle move results in invalid time range.' })
    })

    it('should validate bundle before saving', async() => {
      const bundleBooking2 = {
        ...mockBooking,
        id: new Types.ObjectId(),
        _id: new Types.ObjectId(),
        startTime: '11:00',
        endTime: '12:00',
        save: vi.fn().mockResolvedValue(null),
      }
      vi.mocked(BookingModel.find).mockResolvedValue([mockBooking, bundleBooking2])
      vi.mocked(bookingUtils.checkSlotAvailability).mockResolvedValue({ available: true })

      await reschedule(mockReq, mockRes)

      // Verify that the bundle was processed without error
      expect(mockRes.json).toHaveBeenCalled()
    })
  })
})
