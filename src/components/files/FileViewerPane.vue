<script setup lang="ts">
import {
  archivePlugin,
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

import { sameOriginPath } from '@/lib/worker-url'
import '@open-file-viewer/core/style.css'

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
defineProps<{
  src: string
  fileName: string
  mimeType: string
}>()

const plugins = [
  videoPlugin({ controlsList: 'nodownload' }),
  audioPlugin(),
  epubPlugin(),
  pdfPlugin({ workerSrc: sameOriginPath(pdfWorkerSrc) }),
  officePlugin(),
  imagePlugin(),
  archivePlugin(),
  textPlugin(),
]
</script>

<template>
  <OpenFileViewer
    :file="src"
    :file-name="fileName"
    :mime-type="mimeType"
    width="100%"
    height="100%"
    fit="contain"
    :toolbar="false"
    theme="auto"
    fallback="download"
    :plugins="plugins"
    class-name="h-full min-h-0"
  />
</template>
