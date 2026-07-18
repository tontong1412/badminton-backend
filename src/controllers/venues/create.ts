import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

interface CreateVenuePayload {
  name: {
    th: string;
    en: string;
  };
  address: string;
  ownerUserID: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  weeklySchedule?: Record<string, { open: string; close: string } | null>;
  holidays?: { date: string; isClosed: boolean; openTime?: string; closeTime?: string }[];
}

const create = async(
  req: Request<unknown, unknown, CreateVenuePayload>,
  res: Response,
): Promise<void> => {
  const venue = new VenueModel({
    ...req.body,
    holidays: req.body.holidays?.map((holiday) => ({
      ...holiday,
      date: new Date(holiday.date),
    })),
  })

  const savedVenue = await venue.save()
  res.status(201).json(savedVenue)
}

export default create