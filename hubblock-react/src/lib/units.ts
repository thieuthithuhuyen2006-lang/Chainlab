export const DECIMALS = 8
export const DECIMAL_BASE = 10 ** DECIMALS

export function parseUnits(value: string): number {
  const trimmed = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Invalid amount format')
  }
  const [integerPart = '0', fractionalPart = ''] = trimmed.split('.')
  if (fractionalPart.length > DECIMALS) {
    throw new Error(`Too many decimal places (max ${DECIMALS})`)
  }
  const sign = integerPart.startsWith('-') ? -1 : 1
  const absInteger = integerPart.replace('-', '')
  const fractional = fractionalPart.padEnd(DECIMALS, '0')
  return sign * (Number.parseInt(absInteger, 10) * DECIMAL_BASE + Number.parseInt(fractional, 10))
}

export function formatUnits(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const integerPart = Math.floor(abs / DECIMAL_BASE)
  const fractionalPart = abs % DECIMAL_BASE
  const fractionalStr = fractionalPart.toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${sign}${integerPart}${fractionalStr ? `.${fractionalStr}` : ''}`
}

export function addUnits(a: number, b: number): number {
  return a + b
}

export function subUnits(a: number, b: number): number {
  return a - b
}

export function mulUnits(a: number, b: number): number {
  return Math.round((a * b) / DECIMAL_BASE)
}

export function divUnits(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero')
  return Math.round((a * DECIMAL_BASE) / b)
}