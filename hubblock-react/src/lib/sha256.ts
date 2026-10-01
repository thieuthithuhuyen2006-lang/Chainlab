const encoder = new TextEncoder()

export async function sha256(value: string): Promise<string> {
  return sha256Bytes(encoder.encode(value))
}

export async function sha256Bytes(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', value.slice().buffer as ArrayBuffer)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function countDifferentBits(first: string, second: string): number {
  if (first.length !== second.length || !/^[\da-f]*$/i.test(first) || !/^[\da-f]*$/i.test(second)) {
    throw new Error('Bit comparison requires equal-length hexadecimal strings.')
  }
  let count = 0
  for (let index = 0; index < first.length; index += 1) {
    let different = Number.parseInt(first[index], 16) ^ Number.parseInt(second[index], 16)
    while (different) {
      count += different & 1
      different >>= 1
    }
  }
  return count
}

export function formatHash(value: string): string[] {
  return value.match(/.{1,8}/g) ?? []
}