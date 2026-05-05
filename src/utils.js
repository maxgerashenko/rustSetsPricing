import { MARKET_LISTINGS_BASE } from './constants.js'

export const parseItems = raw => [...new Set(
  raw.split(/[\n,]+/)
    .map(val => val.trim())
    .filter(Boolean)
)]

export const parseDollars = str => {
  if (str == null) return 0

  const num = parseFloat(str.replace(/[^0-9.]/g, ''))

  return isNaN(num) ? 0 : num
}

export const getMarketUrl = name => `${MARKET_LISTINGS_BASE}${encodeURIComponent(name)}`
