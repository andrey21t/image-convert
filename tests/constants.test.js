import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_FORMATS,
  SUPPORTED_INPUT_MIMES,
  DEFAULT_QUALITY,
  DEFAULT_FORMAT,
  MAX_FILES,
  MAX_FILE_SIZE,
  MIME_BY_FORMAT,
  EXT_BY_FORMAT,
  FORMATS_NEEDING_WHITE_BG
} from '../src/lib/constants.js'

describe('constants', () => {
  it('exposes 4 supported output formats', () => {
    expect(SUPPORTED_FORMATS).toEqual(['png', 'jpeg', 'webp', 'avif'])
  })

  it('exposes supported input MIME types', () => {
    expect(SUPPORTED_INPUT_MIMES).toContain('image/png')
    expect(SUPPORTED_INPUT_MIMES).toContain('image/jpeg')
    expect(SUPPORTED_INPUT_MIMES).toContain('image/webp')
    expect(SUPPORTED_INPUT_MIMES).toContain('image/avif')
  })

  it('defaults to WebP @ quality 80', () => {
    expect(DEFAULT_FORMAT).toBe('webp')
    expect(DEFAULT_QUALITY).toBe(80)
  })

  it('caps batch at 20 files, 50MB each', () => {
    expect(MAX_FILES).toBe(20)
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
  })

  it('maps formats to MIME types', () => {
    expect(MIME_BY_FORMAT.png).toBe('image/png')
    expect(MIME_BY_FORMAT.jpeg).toBe('image/jpeg')
    expect(MIME_BY_FORMAT.webp).toBe('image/webp')
    expect(MIME_BY_FORMAT.avif).toBe('image/avif')
  })

  it('maps formats to file extensions', () => {
    expect(EXT_BY_FORMAT.png).toBe('png')
    expect(EXT_BY_FORMAT.jpeg).toBe('jpg')
    expect(EXT_BY_FORMAT.webp).toBe('webp')
    expect(EXT_BY_FORMAT.avif).toBe('avif')
  })

  it('FORMATS_NEEDING_WHITE_BG: only lossy formats (D10)', () => {
    expect(FORMATS_NEEDING_WHITE_BG.png).toBe(false)
    expect(FORMATS_NEEDING_WHITE_BG.jpeg).toBe(true)
    expect(FORMATS_NEEDING_WHITE_BG.webp).toBe(true)
    expect(FORMATS_NEEDING_WHITE_BG.avif).toBe(true)
  })
})
