import { describe, expect, it } from 'vitest'
import { formatBytes } from '../format'

describe('formatBytes', () => {
  it('leaves bytes alone below a kilobyte', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('shows one decimal while the number is small enough to need it', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1048576)).toBe('1.0 MB')
  })

  it('drops the decimal once the number reads cleanly without it', () => {
    expect(formatBytes(12345678)).toBe('12 MB')
  })

  it('formats the size a real listing reports', () => {
    // The API reports 3297280 for a 3.1 MB course video.
    expect(formatBytes(3297280)).toBe('3.1 MB')
  })
})