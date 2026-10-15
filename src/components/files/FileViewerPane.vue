<script setup lang="ts">
import {
  // archivePlugin,
  audioPlugin,
  epubPlugin,
  imagePlugin,
  officePlugin,
  pdfPlugin,
  textPlugin,
  videoPlugin,
} from '@open-file-viewer/core'
import { OpenFileViewer } from '@open-file-viewer/vue'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { PreviewToolbarOptions } from '@open-file-viewer/core'
import { sameOriginPath } from '@/lib/worker-url'
import '@open-file-viewer/core/style.css'
import {computed} from "vue";

/**
 * Wrapper so the CSS import, the plugin list and the pdf.js worker URL live
 * together. FilesView lazy-loads this file, so the whole viewer — JS *and*
 * CSS — arrives as one on-demand chunk and the initial bundle is unaffected.
 *
 * Plugin order matters: specific formats before general ones. Each plugin's
 * match() decides what it handles from the file extension and MIME type, so
 * callers never switch on type themselves — see api/media.ts for choosing the
 * URL, which is a server concern, not a rendering one.
 *
 * CAD/DWG, GIS and 3D are deliberately not registered: their peers are heavy
 * WASM packages (`@mlightcad/*`) and this account has no such files. Without
 * them those formats fall through to the download fallback.
 */
const plugins = [
  videoPlugin({ controlsList: 'nodownload' }),
  audioPlugin(),
  epubPlugin(),
  pdfPlugin({ workerSrc: `${sameOriginPath(pdfWorkerSrc)}?v=2` }),
  officePlugin(),
  imagePlugin(),
  // archivePlugin(),
  textPlugin(),
]

const props = defineProps<{ src: string; fileName: string; mimeType: string }>()
const extension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/** Native <video>/<audio> controls: no zoom, so no toolbar. */
const MEDIA = new Set(['mp4', 'm4v', 'mov', 'mkv', 'avi', 'webm', 'ogv', 'mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'opus',])

const toolbar = computed<PreviewToolbarOptions | false>(() => {
  const ext = extension(props.fileName)
  if (MEDIA.has(ext) || props.mimeType.startsWith('video/') || props.mimeType.startsWith('audio/'))
    return false
  // Rotate is a per-plugin command; everything else zooms.
  const rotate = ext === 'pdf' || props.mimeType.startsWith('image/')
  return { zoom: true, rotate, fullscreen: true, download: true }
})
</script>

<template>
  <OpenFileViewer
    :toolbar="toolbar"
    :file="src"
    :file-name="fileName"
    :mime-type="mimeType"
    width="100%"
    height="100%"
    fit="contain"
    theme="auto"
    fallback="download"
    :plugins="plugins"
    class-name="h-full min-h-0"
  />
</template>
