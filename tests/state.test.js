import { describe, it, expect } from 'vitest'
import {
  createJob,
  createBatchState,
  hasJobs,
  hasCompletedJobs,
  hasPendingJobs,
  isProcessing
} from '../src/lib/state.js'

function makeFile(name = 'test.png', size = 1024, type = 'image/png') {
  return new File([new ArrayBuffer(size)], name, { type })
}

describe('state — createJob', () => {
  it('creates a pending job with id, file, name, size', () => {
    const file = makeFile('image.png', 1024)
    const job = createJob(file)
    expect(job.id).toMatch(/^[a-f0-9-]{36}$/)
    expect(job.file).toBe(file)
    expect(job.name).toBe('image.png')
    expect(job.originalSize).toBe(1024)
    expect(job.status).toBe('pending')
    expect(job.thumbUrl).toMatch(/^blob:/)
  })
})

describe('state — createBatchState', () => {
  it('creates default state with empty jobs', () => {
    const state = createBatchState()
    expect(state.jobs).toEqual([])
    expect(state.defaultFormat).toBe('webp')
    expect(state.defaultQuality).toBe(80)
    expect(state.resizeEnabled).toBe(false)
  })

  it('accepts overrides', () => {
    const state = createBatchState([], { defaultFormat: 'png', defaultQuality: 50 })
    expect(state.defaultFormat).toBe('png')
    expect(state.defaultQuality).toBe(50)
  })
})

describe('state — predicates', () => {
  it('hasJobs detects non-empty list', () => {
    expect(hasJobs([])).toBe(false)
    expect(hasJobs([createJob(makeFile())])).toBe(true)
  })

  it('hasPendingJobs detects pending status', () => {
    const j1 = createJob(makeFile())
    const j2 = createJob(makeFile())
    j2.status = 'done'
    expect(hasPendingJobs([j1, j2])).toBe(true)
    expect(hasPendingJobs([j2])).toBe(false)
  })

  it('hasCompletedJobs detects done status', () => {
    const j1 = createJob(makeFile())
    const j2 = createJob(makeFile())
    j2.status = 'done'
    expect(hasCompletedJobs([j1])).toBe(false)
    expect(hasCompletedJobs([j1, j2])).toBe(true)
  })

  it('isProcessing detects processing status', () => {
    const j = createJob(makeFile())
    expect(isProcessing([j])).toBe(false)
    j.status = 'processing'
    expect(isProcessing([j])).toBe(true)
  })
})
