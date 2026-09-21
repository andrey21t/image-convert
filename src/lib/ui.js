import { MAX_FILES, MAX_FILE_SIZE, SUPPORTED_INPUT_MIMES } from './constants.js'
import {
  hasJobs,
  hasCompletedJobs,
  hasPendingJobs,
  isProcessing,
  releaseThumbnails
} from './state.js'

const template = () => document.getElementById('job-card-template')
const jobsEl = () => document.getElementById('jobs')

/**
 * @param {Job} job
 * @returns {HTMLElement}
 */
export function renderJobCard(job) {
  const node = template().content.firstElementChild.cloneNode(true)
  node.dataset.jobId = job.id
  const thumb = node.querySelector('[data-job-thumb]')
  const name = node.querySelector('[data-job-name]')
  const meta = node.querySelector('[data-job-meta]')
  const status = node.querySelector('[data-job-status]')
  if (job.thumbUrl) {
    thumb.src = job.thumbUrl
  } else {
    thumb.removeAttribute('src')
  }
  thumb.alt = job.name
  name.textContent = job.name
  meta.textContent = formatBytes(job.originalSize)
  status.textContent = job.status
  status.className = `job-status is-${job.status}`
  return node
}

/**
 * @param {Job[]} jobs
 * @returns {void}
 */
export function renderJobs(jobs) {
  const el = jobsEl()
  el.replaceChildren()
  for (const job of jobs) {
    el.appendChild(renderJobCard(job))
  }
}

/**
 * @param {Job} job
 * @returns {void}
 */
export function updateJobCard(job) {
  const card = jobsEl().querySelector(`[data-job-id="${job.id}"]`)
  if (!card) return
  const status = card.querySelector('[data-job-status]')
  status.textContent = job.status
  status.className = `job-status is-${job.status}`
  if (job.resultSize !== undefined) {
    const meta = card.querySelector('[data-job-meta]')
    meta.textContent = `${formatBytes(job.originalSize)} → ${formatBytes(job.resultSize)}`
  }
  if (job.error) {
    const meta = card.querySelector('[data-job-meta]')
    meta.textContent = job.error
  }
}

/**
 * @param {Job[]} jobs
 * @param {{enabled: boolean, width?: number, height?: number}} [resize]
 * @returns {void}
 */
export function updateButtons(jobs, resize) {
  const convertBtn = document.getElementById('convert-btn')
  const downloadBtn = document.getElementById('download-btn')
  const clearBtn = document.getElementById('clear-btn')
  const formatSelect = document.getElementById('format-select')
  const resizeToggle = document.getElementById('resize-toggle')
  const resizeWidth = document.getElementById('resize-width')
  const resizeHeight = document.getElementById('resize-height')
  const qualitySlider = document.getElementById('quality-slider')
  const processing = isProcessing(jobs)
  // Resize guard: if checkbox on but both W and H empty → no valid resize
  // config. Disable Convert so user must fill a field or uncheck Resize.
  const resizeBlocking = resize?.enabled && !resize?.width && !resize?.height
  convertBtn.disabled = !hasJobs(jobs) || processing || resizeBlocking
  downloadBtn.disabled = !hasCompletedJobs(jobs) || processing || hasPendingJobs(jobs)
  clearBtn.disabled = !hasJobs(jobs) || processing
  // Lock format select while there are done jobs — prevents accidental
  // mixed-format ZIP when user adds a new file after the first batch.
  if (formatSelect) {
    formatSelect.disabled = hasCompletedJobs(jobs) || processing
  }
  // Lock resize + quality controls during processing — preserves invariant
  // that all jobs in one batch use the same conversion settings.
  if (resizeToggle) resizeToggle.disabled = processing
  if (resizeWidth) resizeWidth.disabled = processing || !resize?.enabled
  if (resizeHeight) resizeHeight.disabled = processing || !resize?.enabled
  if (qualitySlider) qualitySlider.disabled = processing
}

/**
 * @param {Job[]} jobs
 * @returns {void}
 */
export function toggleSettings(jobs) {
  const settings = document.getElementById('settings')
  const badge = document.querySelector('.privacy-badge')
  const visible = hasJobs(jobs)
  settings.hidden = !visible
  if (badge) badge.classList.toggle('is-visible', visible)
}

/**
 * @param {number} done
 * @param {number} total
 * @returns {void}
 */
export function updateProgress(done, total) {
  const wrap = document.getElementById('progress')
  const fill = document.querySelector('[data-testid="progress-fill"]')
  if (total === 0) {
    wrap.hidden = true
    fill.style.width = '0%'
    return
  }
  wrap.hidden = false
  fill.style.width = `${Math.round((done / total) * 100)}%`
  if (done === total) {
    setTimeout(() => {
      wrap.hidden = true
    }, 600)
  }
}

/**
 * @param {string} message
 * @returns {void}
 */
export function showError(message) {
  const wrap = document.getElementById('progress')
  const fill = document.querySelector('[data-testid="progress-fill"]')
  wrap.hidden = false
  fill.style.background = 'var(--status-error)'
  fill.style.width = '100%'
  console.error(message)
  setTimeout(() => {
    wrap.hidden = true
    fill.style.background = ''
    fill.style.width = '0%'
  }, 1500)
}

/**
 * @param {FileList|File[]} files
 * @returns {File[]}
 */
export function filterAccepted(files) {
  return Array.from(files)
    .filter((f) => f.type.startsWith('image/'))
    .filter((f) => SUPPORTED_INPUT_MIMES.includes(f.type))
    .filter((f) => f.size <= MAX_FILE_SIZE)
    .slice(0, MAX_FILES)
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * @param {Job[]} jobs
 * @returns {void}
 */
export function clearJobsUI(jobs) {
  releaseThumbnails(jobs)
  jobsEl().replaceChildren()
}
