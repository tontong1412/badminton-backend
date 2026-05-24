export interface SlipOKResult {
  success: boolean;
  transRef?: string;
  amount?: number;
  senderName?: string;
  receiverName?: string;
  errorMessage?: string;
}

/**
 * Verifies a payment slip image via the SlipOK API.
 * Accepts a raw Buffer and its MIME type (e.g. 'image/jpeg').
 * Pass `expectedAmount` to have SlipOK verify the transferred amount server-side.
 */
const verifySlip = async(
  imageBuffer: Buffer,
  mimeType: string,
  expectedAmount: number,
  credentials: { url: string; apiKey: string },
): Promise<SlipOKResult> => {
  if (!credentials.apiKey) {
    return { success: false, errorMessage: 'SlipOK API key not configured' }
  }

  const ext = mimeType.split('/')[1] ?? 'jpg'
  // Copy into a fresh plain ArrayBuffer to satisfy Blob's type constraints
  const plainBuffer = Buffer.from(imageBuffer)
  const form = new FormData()
  form.append('files', new Blob([plainBuffer.buffer], { type: mimeType }), `slip.${ext}`)
  form.append('log', 'true')
  form.append('amount', String(Math.round(expectedAmount * 100) / 100))

  const response = await fetch(credentials.url, {
    method: 'POST',
    headers: { 'x-authorization': credentials.apiKey },
    body: form,
  })

  const json = await response.json() as Record<string, unknown>

  if (!response.ok) {
    const msg = (json.message as string | undefined) ?? `SlipOK error ${response.status}`
    return { success: false, errorMessage: msg }
  }

  const data = json.data as Record<string, unknown> | undefined
  return {
    success: true,
    transRef: data?.transRef as string | undefined,
    amount: data?.amount as number | undefined,
    senderName: (data?.sender as Record<string, string> | undefined)?.displayName,
    receiverName: (data?.receiver as Record<string, string> | undefined)?.displayName,
  }
}

export default { verifySlip }
