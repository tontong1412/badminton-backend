import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { BookingStatus, PaymentStatus, RequestWithCookies } from '../../type'

interface MonthRow {
  monthKey: string;
  monthLabel: string;
  totalBookings: number;
  paidBookings: number;
  cancelledBookings: number;
  paidRevenue: number;
  discountTotal: number;
  bookedMinutes: number;
  utilisationPct: number;
}

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return (h * 60) + m
}

const isValidDate = (value: string): boolean => !Number.isNaN(new Date(value).getTime())

const monthKeyFromDate = (d: Date): string => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

const monthLabelFromKey = (key: string): string => {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const weekdayLabel = (d: Date): string => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

const dateAtUtcMidnight = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

const addDaysUtc = (d: Date, days: number): Date => {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

const getMonthStartUtc = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))

const getMonthEndUtc = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))

const getMonthKeysInRange = (from: Date, to: Date): string[] => {
  const keys: string[] = []
  const cursor = getMonthStartUtc(from)
  const end = getMonthStartUtc(to)
  while (cursor.getTime() <= end.getTime()) {
    keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return keys
}

const overlapRange = (fromA: Date, toA: Date, fromB: Date, toB: Date): { start: Date; end: Date } | null => {
  const start = fromA.getTime() > fromB.getTime() ? fromA : fromB
  const end = toA.getTime() < toB.getTime() ? toA : toB
  return start.getTime() <= end.getTime() ? { start, end } : null
}

const getSingleCourtCapacityMinutes = (
  rangeStart: Date,
  rangeEnd: Date,
  weeklySchedule: Record<string, { open: string; close: string } | null>,
): number => {
  let total = 0
  const start = dateAtUtcMidnight(rangeStart)
  const end = dateAtUtcMidnight(rangeEnd)
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDaysUtc(d, 1)) {
    const day = d.getUTCDay().toString()
    const slot = weeklySchedule[day]
    if (!slot) continue
    total += Math.max(0, toMinutes(slot.close) - toMinutes(slot.open))
  }
  return total
}

const getVenueAnalytics = async(
  req: RequestWithCookies & Request,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  const venueID = typeof req.query.venueID === 'string' ? req.query.venueID : ''
  if (!venueID) {
    res.status(400).json({ message: 'venueID is required' })
    return
  }

  const dateFromInput = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : ''
  const dateToInput = typeof req.query.dateTo === 'string' ? req.query.dateTo : ''
  if (!dateFromInput || !dateToInput || !isValidDate(dateFromInput) || !isValidDate(dateToInput)) {
    res.status(400).json({ message: 'dateFrom and dateTo must be valid dates' })
    return
  }

  const dateFrom = new Date(dateFromInput)
  dateFrom.setUTCHours(0, 0, 0, 0)
  const dateTo = new Date(dateToInput)
  dateTo.setUTCHours(23, 59, 59, 999)

  if (dateTo.getTime() < dateFrom.getTime()) {
    res.status(400).json({ message: 'dateTo must be the same as or later than dateFrom' })
    return
  }

  const venue = await VenueModel.findOne({
    _id: venueID,
    $or: [
      { ownerUserID: currentUser.id },
      { managerUserIDs: currentUser.id },
    ],
  })

  if (!venue) {
    res.status(403).json({ message: 'Access denied for this venue' })
    return
  }

  const courts = await CourtModel.find({ venueID: venue._id })
  const courtIDs = courts.map((c) => c._id)
  const activeCourts = courts.filter((c) => c.status === 'active')
  const activeCourtCount = activeCourts.length

  const bookings = courtIDs.length === 0
    ? []
    : await BookingModel.find({
      courtID: { $in: courtIDs },
      date: { $gte: dateFrom, $lte: dateTo },
    }).sort({ date: 1, startTime: 1 })

  const allInRange = bookings
  const filtered = bookings.filter((b) => b.status !== BookingStatus.Cancelled)
  const paidBookings = filtered.filter((b) => b.paymentStatus === PaymentStatus.Paid && !b.resaleSourceListingID)

  const paidRevenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0)
  const pendingRevenue = filtered
    .filter((b) => b.paymentStatus === PaymentStatus.Pending && !b.resaleSourceListingID)
    .reduce((sum, b) => sum + b.totalPrice, 0)
  const unpaidRevenue = filtered
    .filter((b) => b.paymentStatus === PaymentStatus.Unpaid && !b.resaleSourceListingID)
    .reduce((sum, b) => sum + b.totalPrice, 0)
  const discountTotal = allInRange.reduce((sum, b) => sum + (b.discountAmount ?? 0), 0)
  const cancelledBookings = allInRange.filter((b) => b.status === BookingStatus.Cancelled).length

  const singleCourtCapacityMinutes = getSingleCourtCapacityMinutes(dateFrom, dateTo, venue.weeklySchedule)
  const totalCapacityMinutes = singleCourtCapacityMinutes * activeCourtCount
  const bookedMinutes = filtered.reduce((sum, b) => sum + b.durationMinutes, 0)
  const utilisationPct = totalCapacityMinutes > 0 ? Math.round((bookedMinutes / totalCapacityMinutes) * 100) : 0

  const monthKeys = getMonthKeysInRange(dateFrom, dateTo)
  const monthlyRows: MonthRow[] = monthKeys.map((monthKey) => {
    const [year, month] = monthKey.split('-').map(Number)
    const monthStart = getMonthStartUtc(new Date(Date.UTC(year, month - 1, 1)))
    const monthEnd = getMonthEndUtc(monthStart)
    const overlap = overlapRange(dateFrom, dateTo, monthStart, monthEnd)
    if (!overlap) {
      return {
        monthKey,
        monthLabel: monthLabelFromKey(monthKey),
        totalBookings: 0,
        paidBookings: 0,
        cancelledBookings: 0,
        paidRevenue: 0,
        discountTotal: 0,
        bookedMinutes: 0,
        utilisationPct: 0,
      }
    }

    const monthAll = allInRange.filter((b) => b.date >= overlap.start && b.date <= overlap.end)
    const monthFiltered = monthAll.filter((b) => b.status !== BookingStatus.Cancelled)
    const monthPaid = monthFiltered.filter((b) => b.paymentStatus === PaymentStatus.Paid && !b.resaleSourceListingID)
    const monthPaidRevenue = monthPaid.reduce((sum, b) => sum + b.totalPrice, 0)
    const monthDiscount = monthAll.reduce((sum, b) => sum + (b.discountAmount ?? 0), 0)
    const monthBookedMinutes = monthFiltered.reduce((sum, b) => sum + b.durationMinutes, 0)
    const monthSingleCourtCapacity = getSingleCourtCapacityMinutes(overlap.start, overlap.end, venue.weeklySchedule)
    const monthTotalCapacity = monthSingleCourtCapacity * activeCourtCount
    const monthUtilisationPct = monthTotalCapacity > 0
      ? Math.round((monthBookedMinutes / monthTotalCapacity) * 100)
      : 0

    return {
      monthKey,
      monthLabel: monthLabelFromKey(monthKey),
      totalBookings: monthFiltered.length,
      paidBookings: monthPaid.length,
      cancelledBookings: monthAll.filter((b) => b.status === BookingStatus.Cancelled).length,
      paidRevenue: monthPaidRevenue,
      discountTotal: monthDiscount,
      bookedMinutes: monthBookedMinutes,
      utilisationPct: monthUtilisationPct,
    }
  })

  const weekdayDemandMap: Record<string, number> = {}
  filtered.forEach((b) => {
    const key = weekdayLabel(b.date)
    weekdayDemandMap[key] = (weekdayDemandMap[key] ?? 0) + 1
  })
  const weekdayDemand = Object.entries(weekdayDemandMap)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count)

  const hourDemandMap: Record<string, number> = {}
  filtered.forEach((b) => {
    const startHour = parseInt(b.startTime.split(':')[0], 10)
    const endHour = parseInt(b.endTime.split(':')[0], 10)
    for (let hour = startHour; hour < endHour; hour++) {
      const key = `${String(hour).padStart(2, '0')}:00`
      hourDemandMap[key] = (hourDemandMap[key] ?? 0) + 1
    }
  })
  const hourDemand = Object.entries(hourDemandMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)

  const courtRanking = activeCourts.map((court) => {
    const courtFiltered = filtered.filter((b) => b.courtID.toString() === court._id.toString())
    const courtPaidRevenue = courtFiltered
      .filter((b) => b.paymentStatus === PaymentStatus.Paid && !b.resaleSourceListingID)
      .reduce((sum, b) => sum + b.totalPrice, 0)
    const courtBookedMinutes = courtFiltered.reduce((sum, b) => sum + b.durationMinutes, 0)
    const courtUtilisationPct = singleCourtCapacityMinutes > 0
      ? Math.round((courtBookedMinutes / singleCourtCapacityMinutes) * 100)
      : 0
    return {
      courtID: court._id.toString(),
      courtName: court.name,
      paidRevenue: courtPaidRevenue,
      bookedMinutes: courtBookedMinutes,
      utilisationPct: courtUtilisationPct,
    }
  }).sort((a, b) => b.paidRevenue - a.paidRevenue)

  const sortedMonthly = [...monthlyRows].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  const latest = sortedMonthly[sortedMonthly.length - 1]
  const previous = sortedMonthly[sortedMonthly.length - 2]
  const monthOverMonthGrowthPct = previous && previous.paidRevenue > 0
    ? Math.round(((latest.paidRevenue - previous.paidRevenue) / previous.paidRevenue) * 100)
    : null

  const movingAverageSource = sortedMonthly.slice(-3)
  const forecastNextMonth = movingAverageSource.length === 0
    ? { monthLabel: 'N/A', bookings: 0, paidRevenue: 0, basisMonths: 0 }
    : {
      monthLabel: latest
        ? monthLabelFromKey(monthKeyFromDate(addDaysUtc(getMonthStartUtc(new Date(`${latest.monthKey}-01T00:00:00.000Z`)), 32)))
        : 'N/A',
      bookings: Math.round(movingAverageSource.reduce((sum, m) => sum + m.totalBookings, 0) / movingAverageSource.length),
      paidRevenue: Math.round(movingAverageSource.reduce((sum, m) => sum + m.paidRevenue, 0) / movingAverageSource.length),
      basisMonths: movingAverageSource.length,
    }

  res.json({
    period: {
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
    },
    summary: {
      totalBookings: filtered.length,
      paidBookings: paidBookings.length,
      cancelledBookings,
      paidRevenue,
      pendingRevenue,
      unpaidRevenue,
      discountTotal,
      bookedMinutes,
      utilisationPct,
      monthOverMonthGrowthPct,
    },
    monthlyRows,
    weekdayDemand,
    hourDemand,
    courtRanking,
    forecastNextMonth,
  })
}

export default getVenueAnalytics