import { v4 as uuidv4 } from 'uuid'

export function generateIdempotencyKey(): string {
  return uuidv4()
}

export function webhookIdempotencyKey(channel: string, externalId: string): string {
  return `${channel}-${externalId}`
}
