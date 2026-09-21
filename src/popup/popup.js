import { createJob, hasJobs, isProcessing } from '../lib/state.js'
import { convertImage } from '../lib/convert.js'
import { getSupportedOutputFormats } from '../lib/formats.js'
import { createZip } from '../lib/zip.js'
import { EXT_BY_FORMAT, MAX_FILES, SUPPORTED_INPUT_MIMES } from '../lib/constants.js'
import { getAllJobs, putJob, deleteJob, clearJobs } from '../lib/idb.js'
import {
  renderJobs,
  updateJobCard,
  updateButtons,
  toggleSettings,
  updateProgress,
  showError,
  filterAccepted,
  clearJobsUI
} from '../lib/ui.js'

const state = {
  jobs: [],
  format: 'webp',
  quality: 80,
  resizeEnabled: false,
  resize: { width: undefined, height: undefined }
}

function $(id) {
  return document.getElementById(id)
}

function updateAllButtons() {
  updateButtons(state.jobs, {
    enabled: state.resizeEnabled,
    width: state.resize.width,
    height: state.resize.height
  })
}

function addFiles(files) {
  const accepted = filterAccepted(files)
  if (accepted.length === 0) {
    showDropzoneError('Only PNG, JPEG, WebP, AVIF files are supported')
    return
  }
  // Warn if more supported images were dropped than the 20-file cap allows.
  const supportedCount = Array.from(files)
    .filter((f) => f.type.startsWith('image/'))
    .filter((f) => SUPPORTED_INPUT_MIMES.includes(f.type))
    .filter((f) => f.size <= 50 * 1024 * 1024).length
  if (supportedCount > accepted.length && accepted.length === MAX_FILES) {
    showDropzoneError(`Only first 20 images added (${supportedCount} found)`)
  }
  for (const file of accepted) {
    state.jobs.push(createJob(file))
  }
  renderJobs(state.jobs)
  toggleSettings(state.jobs)
  updateAllButtons()
}

function showDropzoneError(message) {
  const dropzone = $('dropzone')
  dropzone.classList.add('is-drag-error')
  let errorText = dropzone.querySelector('.dropzone-error-text')
  if (!errorText) {
    errorText = document.createElement('p')
    errorText.className = 'dropzone-error-text'
    dropzone.appendChild(errorText)
  }
  errorText.textContent = message
  clearTimeout(showDropzoneError._timer)
  showDropzoneError._timer = setTimeout(() => {
    dropzone.classList.remove('is-drag-error')
    if (errorText.parentNode) errorText.remove()
  }, 2500)
}

/**
 * Recursively walk FileSystemEntry tree and collect all File objects.
 * Used for folder-drop (webkitGetAsEntry). readEntries returns batches —
 * keep reading until empty batch.
 * @param {FileSystemEntry[]} entries
 * @returns {Promise<File[]>}
 */
async function collectFilesFromEntries(entries) {
  const files = []
  async function walk(entry) {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => {
        entry.file(resolve, reject)
      })
      files.push(file)
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      const allEntries = await new Promise((resolve, reject) => {
        const collected = []
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) {
              resolve(collected)
            } else {
              collected.push(...batch)
              readBatch()
            }
          }, reject)
        }
        readBatch()
      })
      for (const subEntry of allEntries) {
        await walk(subEntry)
      }
    }
  }
  for (const entry of entries) {
    await walk(entry)
  }
  return files
}

async function runConvert() {
  // re-entry guard: disabled buttons stop real users, but dispatchEvent
  // bypasses it (pinned by Races tests); second entry could restamp job.format
  // mid-flight of another loop (Bug #2 pattern, review W2)
  if (isProcessing(state.jobs)) return
  // If no pending jobs but some are done/error → user wants to re-convert
  // with new quality/resize settings. Reset done/error back to pending and
  // re-run in the SAME format (format-select is locked while done jobs exist).
  const hasPending = state.jobs.some((j) => j.status === 'pending')
  if (!hasPending) {
    for (const job of state.jobs) {
      if (job.status === 'done' || job.status === 'error') {
        job.status = 'pending'
        job.error = undefined
        job.result = undefined
        job.resultSize = undefined
        job.format = undefined
        updateJobCard(job)
      }
    }
  }
  const pendingJobs = state.jobs.filter((j) => j.status === 'pending')
  const total = pendingJobs.length
  let done = 0
  for (const job of pendingJobs) {
    job.status = 'processing'
    updateJobCard(job)
    updateAllButtons()
    try {
      job.format = state.format
      const blob = await convertImage(job.file, {
        format: state.format,
        quality: state.quality,
        resize: state.resizeEnabled ? state.resize : undefined
      })
      job.status = 'done'
      job.result = blob
      job.resultSize = blob.size
      try {
        await putJob(serializeJob(job))
      } catch (e) {
        console.warn('[idb] persist failed', job.id, e.message)
      }
    } catch (err) {
      job.status = 'error'
      job.error = err.message
    }
    updateJobCard(job)
    done++
    updateProgress(done, total)
  }
  updateAllButtons()
}

function clearAll() {
  if (isProcessing(state.jobs)) {
    showError('Cannot clear: conversion in progress')
    return
  }
  clearJobsUI(state.jobs)
  state.jobs = []
  clearJobs().catch((e) => console.warn('[idb] clear failed', e.message))
  toggleSettings(state.jobs)
  updateAllButtons()
}

function removeJob(jobId) {
  if (isProcessing(state.jobs)) return
  const idx = state.jobs.findIndex((j) => j.id === jobId)
  if (idx === -1) return
  const [removed] = state.jobs.splice(idx, 1)
  if (removed?.thumbUrl) URL.revokeObjectURL(removed.thumbUrl)
  renderJobs(state.jobs)
  toggleSettings(state.jobs)
  updateAllButtons()
  // Atomic single-record delete — no window of data loss if popup closes
  // (clearJobs + re-put had a race: popup-close between clear and re-put
  // would leave IDB empty, losing remaining done/error jobs).
  deleteJob(jobId).catch((e) => console.warn('[idb] delete failed', e.message))
}

function serializeJob(job) {
  return {
    id: job.id,
    name: job.name,
    originalSize: job.originalSize,
    resultSize: job.resultSize,
    status: job.status,
    result: job.result,
    format: job.format ?? state.format,
    quality: state.quality
  }
}

function restoreJob(stored) {
  let thumbUrl = ''
  if (stored.result instanceof Blob) {
    thumbUrl = URL.createObjectURL(stored.result)
  }
  return {
    id: stored.id,
    name: stored.name,
    originalSize: stored.originalSize,
    resultSize: stored.resultSize,
    status: stored.status,
    result: stored.result,
    format: stored.format,
    thumbUrl
  }
}

async function downloadZip() {
  const done = state.jobs.filter((j) => j.status === 'done' && j.result)
  if (done.length === 0) {
    showError('No completed jobs to download')
    return
  }
  const files = {}
  const used = new Set()
  for (const job of done) {
    const fmt = job.format ?? state.format
    const ext = EXT_BY_FORMAT[fmt] || fmt
    const baseName = job.name.replace(/\.[^.]+$/, '')
    let name = `${baseName}.${ext}`
    let suffix = 1
    while (used.has(name)) {
      name = `${baseName}-${suffix++}.${ext}`
    }
    used.add(name)
    files[name] = job.result
  }
  try {
    const zipBlob = await createZip(files)
    triggerDownload(zipBlob, 'converted-images.zip')
  } catch (err) {
    showError(`ZIP failed: ${err.message}`)
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function bindEvents() {
  const dropzone = $('dropzone')
  const fileInput = $('file-input')

  dropzone.addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      addFiles(fileInput.files)
      fileInput.value = ''
    }
  })

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropzone.classList.add('is-drag-over')
  })

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('is-drag-over')
  })

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault()
    dropzone.classList.remove('is-drag-over')
    // Folder drop: use items + webkitGetAsEntry to read folder contents.
    // Phase 1: synchronously extract all FileSystemEntry refs before any
    // await — browser invalidates drag-data-store after first await.
    const items = e.dataTransfer.items
    if (items && items.length > 0) {
      const entries = []
      for (const item of [...items]) {
        if (item.kind !== 'file') continue
        const entry = item.webkitGetAsEntry?.() ?? item.getAsEntry?.()
        if (entry) entries.push(entry)
      }
      if (entries.some((en) => en.isDirectory)) {
        const files = await collectFilesFromEntries(entries)
        if (files.length === 0) {
          showDropzoneError('No files found in dropped folder')
          return
        }
        addFiles(files)
        return
      }
    }
    // Fallback: single files (no folder dropped, or older browser)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  })

  $('format-select').addEventListener('change', (e) => {
    state.format = e.target.value
  })

  const qualitySlider = $('quality-slider')
  const qualityValue = $('quality-value')
  qualitySlider.addEventListener('input', (e) => {
    state.quality = Number(e.target.value)
    qualityValue.textContent = String(state.quality)
  })

  const resizeToggle = $('resize-toggle')
  const resizeWidth = $('resize-width')
  const resizeHeight = $('resize-height')
  resizeToggle.addEventListener('change', (e) => {
    state.resizeEnabled = e.target.checked
    resizeWidth.disabled = !state.resizeEnabled
    resizeHeight.disabled = !state.resizeEnabled
    if (!state.resizeEnabled) {
      resizeWidth.value = ''
      resizeHeight.value = ''
      state.resize = { width: undefined, height: undefined }
    }
    updateAllButtons()
  })
  resizeWidth.addEventListener('input', (e) => {
    state.resize.width = e.target.value ? Number(e.target.value) : undefined
    updateAllButtons()
  })
  resizeHeight.addEventListener('input', (e) => {
    state.resize.height = e.target.value ? Number(e.target.value) : undefined
    updateAllButtons()
  })

  $('convert-btn').addEventListener('click', runConvert)
  $('clear-btn').addEventListener('click', clearAll)
  $('download-btn').addEventListener('click', downloadZip)

  // Hover-zoom on thumbnail: floating overlay with full-quality image.
  // Delegated via mouseover/mouseout (they bubble; mouseenter/mouseleave don't).
  // relatedTarget guard skips transitions inside the same thumb.
  let previewTimer = null
  let previewEl = null

  function getPreviewEl() {
    if (!previewEl) {
      previewEl = document.createElement('div')
      previewEl.className = 'image-preview'
      const img = document.createElement('img')
      img.alt = ''
      previewEl.appendChild(img)
      document.body.appendChild(previewEl)
    }
    return previewEl
  }

  function showPreview(thumb) {
    // Guard: card may have been removed between schedule and fire (× clicked mid-hover)
    if (!document.body.contains(thumb)) return
    if (!thumb.src) return
    const overlay = getPreviewEl()
    overlay.querySelector('img').src = thumb.src
    overlay.style.display = ''  // un-hide from previous hidePreview
    const rect = thumb.getBoundingClientRect()
    // Position to the right of thumb, vertically aligned near top.
    // Clamp inside viewport: don't overflow bottom (last thumb near footer)
    // and don't overflow top. Overlay is 220×220, 8px margin from edges.
    const overlaySize = 220
    const margin = 8
    let top = rect.top - 20
    const maxTop = window.innerHeight - overlaySize - margin
    if (top > maxTop) top = maxTop
    if (top < margin) top = margin
    overlay.style.top = `${top}px`
    overlay.style.left = `${Math.min(window.innerWidth - overlaySize - margin, rect.right + margin)}px`
    requestAnimationFrame(() => overlay.classList.add('is-visible'))
  }

  function hidePreview() {
    if (previewEl) previewEl.style.display = 'none'
  }

  $('jobs').addEventListener('mouseover', (e) => {
    const thumb = e.target.closest('[data-job-thumb]')
    if (!thumb) return
    if (e.relatedTarget && thumb.contains(e.relatedTarget)) return
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => showPreview(thumb), 150)
  })

  $('jobs').addEventListener('mouseout', (e) => {
    const thumb = e.target.closest('[data-job-thumb]')
    if (!thumb) return
    if (e.relatedTarget && thumb.contains(e.relatedTarget)) return
    clearTimeout(previewTimer)
    hidePreview()
  })

  // Delegated click for job-remove buttons (cards are re-rendered, so direct
  // binding per button would leak; delegation handles new cards automatically)
  $('jobs').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-job-remove]')
    if (!removeBtn) return
    const card = removeBtn.closest('[data-job-id]')
    if (card) removeJob(card.dataset.jobId)
  })
}

async function filterUnsupportedOptions() {
  const supported = await getSupportedOutputFormats()
  const select = $('format-select')
  for (const option of select.options) {
    if (!supported.includes(option.value)) {
      option.disabled = true
    }
  }
  if (!supported.includes(state.format)) {
    const fallback = supported.find((f) => f !== 'avif') || supported[0] || 'png'
    state.format = fallback
    select.value = fallback
  }
}

async function init() {
  bindEvents()
  await filterUnsupportedOptions()
  await restoreFromIDB()
  console.log('[image-convert] popup ready', { state, hasJobs: hasJobs(state.jobs) })
}

async function restoreFromIDB() {
  try {
    const stored = await getAllJobs()
    if (stored.length === 0) return
    state.jobs = stored.map(restoreJob)
    renderJobs(state.jobs)
    toggleSettings(state.jobs)
    updateAllButtons()
  } catch (e) {
    console.warn('[idb] restore failed', e.message)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init)
}

export { init, addFiles, runConvert, clearAll }
