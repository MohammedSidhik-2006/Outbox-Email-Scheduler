import { redis } from '../lib/redis';
import { env } from '../config/env';

export interface ThrottlingConstraints {
  minDelayMs: number;
  hourlyLimit: number;
}

export type ThrottleResult =
  | { status: 'ALLOW' }
  | { status: 'DEFER'; nextAvailableAt: number; reason: string };

const RESERVE_SLOT_SCRIPT = `
  local senderId = KEYS[1]
  local lastSendKey = KEYS[2]
  local hourlyCountKey = KEYS[3]

  local now = tonumber(ARGV[1])
  local minDelayMs = tonumber(ARGV[2])
  local hourlyLimit = tonumber(ARGV[3])
  local oneHourMs = 3600000

  -- Check Hourly Limit
  local currentHourly = tonumber(redis.call('get', hourlyCountKey) or '0')
  if currentHourly >= hourlyLimit then
    local ttl = redis.call('pttl', hourlyCountKey)
    if ttl < 0 then ttl = oneHourMs end
    return { 'DEFER', tostring(now + ttl), 'HOURLY_LIMIT_REACHED' }
  end

  -- Check Minimum Delay
  local lastSendTime = tonumber(redis.call('get', lastSendKey) or '0')
  local nextAllowedTime = lastSendTime + minDelayMs
  if now < nextAllowedTime then
    return { 'DEFER', tostring(nextAllowedTime), 'MIN_DELAY_NOT_MET' }
  end

  -- Allowed: Update Counters
  redis.call('set', lastSendKey, tostring(now))
  
  if currentHourly == 0 then
    redis.call('set', hourlyCountKey, '1', 'PX', oneHourMs)
  else
    redis.call('incr', hourlyCountKey)
  end

  return { 'ALLOW' }
`;

export class ThrottlingService {
  static async reserveSendSlot(
    senderId: string,
    deliveryId: string,
    constraints: ThrottlingConstraints = {
      minDelayMs: parseInt(env.MIN_EMAIL_DELAY_MS, 10),
      hourlyLimit: parseInt(env.MAX_EMAILS_PER_HOUR_PER_SENDER, 10),
    }
  ): Promise<ThrottleResult> {
    const keys = [
      `throttle:sender:${senderId}`,
      `throttle:sender:${senderId}:last_send`,
      `throttle:sender:${senderId}:hourly_count`,
    ];
    const args = [
      Date.now().toString(),
      constraints.minDelayMs.toString(),
      constraints.hourlyLimit.toString(),
    ];

    const result = await redis.eval(RESERVE_SLOT_SCRIPT, 3, ...keys, ...args) as [string, string?, string?];

    const status = result[0];
    if (status === 'ALLOW') {
      return { status: 'ALLOW' };
    } else {
      return {
        status: 'DEFER',
        nextAvailableAt: parseInt(result[1]!, 10),
        reason: result[2]!,
      };
    }
  }
}
