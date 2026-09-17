import { createJob, hasJobs, isProcessing } from '../lib/state.js'
import { convertImage } from '../lib/convert.js'
import { getSupportedOutputFormats } from '../lib/formats.js'
import { createZip } from '../lib/zip.js'
import { EXT_BY_FORMAT } from '../lib/constants.js'
import { getAllJobs, putJob, clearJobs } from '../lib/idb.js'
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

function addFiles(files) {
  const accepted = filterAccepted(files)
  if (accepted.length === 0) {
    showError('No image files selected')
    return
  }
  for (const file of accepted) {
    state.jobs.push(createJob(file))
  }
  renderJobs(state.jobs)
  toggleSettings(state.jobs)
  updateButtons(state.jobs)
}

async function runConvert() {
  const pendingJobs = state.jobs.filter((j) => j.status === 'pending')
  const total = pendingJobs.length
  let done = 0
  for (const job of pendingJobs) {
    job.status = 'processing'
    updateJobCard(job)
    updateButtons(state.jobs)
    try {
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
  updateButtons(state.jobs)
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
  updateButtons(state.jobs)
}

function serializeJob(job) {
  return {
    id: job.id,
    name: job.name,
    originalSize: job.originalSize,
    resultSize: job.resultSize,
    status: job.status,
    result: job.result,
    format: state.format,
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
  for (const job of done) {
    const baseName = job.name.replace(/\.[^.]+$/, '')
    const ext = EXT_BY_FORMAT[state.format] || state.format
    files[`${baseName}.${ext}`] = job.result
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

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropzone.classList.remove('is-drag-over')
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
  const resizeFields = $('resize-fields')
  const resizeWidth = $('resize-width')
  const resizeHeight = $('resize-height')
  resizeToggle.addEventListener('change', (e) => {
    state.resizeEnabled = e.target.checked
    resizeFields.hidden = !state.resizeEnabled
    if (!state.resizeEnabled) {
      resizeWidth.value = ''
      resizeHeight.value = ''
      state.resize = { width: undefined, height: undefined }
    }
  })
  resizeWidth.addEventListener('input', (e) => {
    state.resize.width = e.target.value ? Number(e.target.value) : undefined
  })
  resizeHeight.addEventListener('input', (e) => {
    state.resize.height = e.target.value ? Number(e.target.value) : undefined
  })

  $('convert-btn').addEventListener('click', runConvert)
  $('clear-btn').addEventListener('click', clearAll)
  $('download-btn').addEventListener('click', downloadZip)
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
    updateButtons(state.jobs)
  } catch (e) {
    console.warn('[idb] restore failed', e.message)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init)
}

export { init, addFiles, runConvert, clearAll }
