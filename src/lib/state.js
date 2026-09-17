import { DEFAULT_FORMAT, DEFAULT_QUALITY } from './constants.js'

/**
 * @typedef {Object} Job
 * @property {string} id
 * @property {File} file
 * @property {string} name
 * @property {number} originalSize
 * @property {'pending'|'processing'|'done'|'error'} status
 * @property {Blob=} result
 * @property {string=} error
 * @property {number=} resultSize
 * @property {string=} thumbUrl
 */

/**
 * @param {File} file
 * @returns {Job}
 */
export function createJob(file) {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    originalSize: file.size,
    status: 'pending',
    thumbUrl: URL.createObjectURL(file)
  }
}

/**
 * @param {Job[]} jobs
 * @param {Object} [overrides]
 * @returns {Object}
 */
export function createBatchState(jobs = [], overrides = {}) {
  return {
    jobs,
    defaultFormat: DEFAULT_FORMAT,
    defaultQuality: DEFAULT_QUALITY,
    resizeEnabled: false,
    resizeConfig: { width: undefined, height: undefined, scale: undefined },
    ...overrides
  }
}

/**
 * @param {Job[]} jobs
 * @returns {boolean}
 */
export function hasJobs(jobs) {
  return jobs.length > 0
}

/**
 * @param {Job[]} jobs
 * @returns {boolean}
 */
export function hasCompletedJobs(jobs) {
  return jobs.some((j) => j.status === 'done')
}

/**
 * @param {Job[]} jobs
 * @returns {boolean}
 */
export function hasPendingJobs(jobs) {
  return jobs.some((j) => j.status === 'pending')
}

/**
 * @param {Job[]} jobs
 * @returns {boolean}
 */
export function isProcessing(jobs) {
  return jobs.some((j) => j.status === 'processing')
}

/**
 * @param {Job[]} jobs
 * @returns {void}
 */
export function releaseThumbnails(jobs) {
  for (const job of jobs) {
    if (job.thumbUrl) {
      URL.revokeObjectURL(job.thumbUrl)
    }
  }
}
