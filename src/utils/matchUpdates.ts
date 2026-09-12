import { Response } from 'express'

export interface MatchUpdateEventPayload {
  tournamentID: string
  matchID: string
}

const matchStreams = new Map<string, Set<Response>>()
const keepAliveTimers = new Map<Response, NodeJS.Timeout>()

const getStreamSet = (tournamentID: string) => {
  let streamSet = matchStreams.get(tournamentID)
  if (!streamSet) {
    streamSet = new Set<Response>()
    matchStreams.set(tournamentID, streamSet)
  }
  return streamSet
}

const removeStream = (tournamentID: string, res: Response) => {
  const streamSet = matchStreams.get(tournamentID)
  if (streamSet) {
    streamSet.delete(res)
    if (streamSet.size === 0) {
      matchStreams.delete(tournamentID)
    }
  }

  const timer = keepAliveTimers.get(res)
  if (timer) {
    clearInterval(timer)
    keepAliveTimers.delete(res)
  }
}

export const addMatchUpdateStream = (tournamentID: string, res: Response) => {
  const streamSet = getStreamSet(tournamentID)
  streamSet.add(res)

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  res.write(`data: ${JSON.stringify({ type: 'ready', tournamentID })}\n\n`)

  const keepAliveTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keep-alive\n\n')
    }
  }, 30000)
  keepAliveTimers.set(res, keepAliveTimer)

  const closeStream = () => {
    removeStream(tournamentID, res)
  }

  res.on('close', closeStream)
  res.on('finish', closeStream)
}

export const broadcastMatchUpdate = (payload: MatchUpdateEventPayload) => {
  const streamSet = matchStreams.get(payload.tournamentID)
  if (!streamSet || streamSet.size === 0) {
    return
  }

  const message = `data: ${JSON.stringify({ type: 'match-updated', ...payload })}\n\n`

  for (const res of streamSet) {
    if (res.writableEnded) {
      removeStream(payload.tournamentID, res)
      continue
    }

    try {
      res.write(message)
    } catch (_error) {
      removeStream(payload.tournamentID, res)
    }
  }
}
