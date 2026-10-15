import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { Entry } from '@/stores/library'
import FileList from '../FileList.vue'

const ENTRIES: Entry[] = []

describe('FileList empty state', () => {
  // An empty Starred list must not tell the user to open a file — the list is
  // driven by stars, not by opening anything.
  it('shows the collection its own instruction when empty', () => {
    const starred = mount(FileList, {
      props: { entries: ENTRIES, emptyText: 'Star a file and it shows up here.' },
      global: { plugins: [createPinia()] },
    })

    expect(starred.text()).toBe('Star a file and it shows up here.')
  })
})