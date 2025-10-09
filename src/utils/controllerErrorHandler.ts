

/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express'

// Define an interface for errors that might have a status code.
// This is common for custom HTTP error classes.
interface HttpError extends Error {
  status?: number;
}

/**
 * Wraps an Express controller function to provide centralized error handling.
 * It catches any exceptions thrown by the controller and sends a standardized
 * error response to the client.
 *
 * @param func The asynchronous controller function (req, res) => Promise<any>
 * @returns An asynchronous middleware function (req, res) => Promise<Response | void>
 */
type AnyAsyncFunction = (...args: any[]) => Promise<any>;
const controllerErrorHandler = (func: AnyAsyncFunction) => async(req: Request, res: Response) => {
  try {
    return await func(req, res)
  } catch (err) {
    // We assert the error type to HttpError so we can safely check for 'status'.
    const error = err as HttpError

    // Default to 500 Internal Server Error if no status is specified
    const errorStatus = error.status || 500

    console.error(error)

    // Send the error response
    return res.status(errorStatus).send({
      // We use error.message if available, otherwise fall back to toString()
      error: error.message || error.toString(),
    })
  }
}

export default controllerErrorHandler