import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface Registration {
  config: { name: string; id?: string; order?: number }
  component: (props: Record<string, unknown>) => unknown
}

describe('king-dsh client slot occupants', () => {
  it('registers the downstream name, mark and localized new-session copy', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
        inject: string[]
      }
    } | undefined
    const appended: Array<{ textContent?: string }> = []
    const removeStyle = vi.fn()
    const removeLocale = vi.fn()
    const localeRegister = vi.fn(() => removeLocale)
    const translate = (key: string): string => ({
      heroTitle: 'What will you accomplish today?',
      heroHint: 'Describe the goal, choose a workspace and mode, then begin.'
    })[key] ?? key
    let disposeStyle: (() => void) | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: removeStyle })),
      head: { appendChild: (node: { textContent?: string }) => appended.push(node) }
    }
    vm.runInNewContext(source, {
      document,
      navigator: { language: 'en-US' },
      window: {
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })

    expect(definition).toBeDefined()
    const createElement = (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ): { type: unknown; props: Record<string, unknown> } => ({
      type,
      props: { ...props, children }
    })
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement,
          useEffect: (effect: () => void | (() => void)) => effect(),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { MenuItemButton: vi.fn() }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const registrations: Registration[] = []
    const slots = {
      inject: (_name: string, callback: () => unknown): unknown => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) {
          for (const _entry of result as Iterable<unknown>) void _entry
        }
        return result
      },
      register: (
        config: Registration['config'],
        component: Registration['component']
      ): (() => void) => {
        registrations.push({ config, component })
        return () => undefined
      }
    }
    plugin.apply({
      slots,
      locale: { register: localeRegister, bind: () => translate },
      effect: (setup: () => (() => void) | undefined) => { disposeStyle = setup() }
    })

    expect(plugin.inject).toEqual(['slots', 'locale', 'remote.session', 'sessions', 'uiWorkspace'])
    expect(registrations.map(({ config }) => config.name)).toEqual([
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark',
      'conversation.hero.brand.content',
      'sidebar.right.tab.document.unpreviewable',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item'
    ])
    // Desktop toolbar styles have an owned lifetime.
    expect(appended).toHaveLength(1)
    expect(appended[0]?.textContent).toContain('.dshDesktopHeroCopy')
    expect(appended[0]?.textContent).toContain("[data-dsh-preset-search]")
    expect(localeRegister).toHaveBeenCalledWith('dsh-desktop-client-ui', {
      zh: {
        heroTitle: '今天想完成什么？',
        heroHint: '描述目标，选择工作区与模式，然后开始。'
      },
      en: {
        heroTitle: 'What will you accomplish today?',
        heroHint: 'Describe the goal, choose a workspace and mode, then begin.'
      }
    })
    disposeStyle?.()
    expect(removeStyle).toHaveBeenCalledOnce()
    expect(removeLocale).toHaveBeenCalledOnce()

    const sidebarName = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.name'
    )!.component({}) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarName.type).toBe('span')
    expect(sidebarName.props.children).toEqual(['king-dsh'])

    const sidebarMark = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.mark'
    )!.component({ size: 24 }) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarMark.type).toBe('img')
    expect(sidebarMark.props.src).toBe('/dsh-desktop-logo-dark.png')
    expect(sidebarMark.props.width).toBe(19)
    expect(sidebarMark.props.height).toBe(19)

    const heroMark = registrations.find(
      ({ config }) => config.name === 'conversation.hero.brand.mark'
    )!.component({ size: 48 }) as { type: unknown; props: Record<string, unknown> }
    expect(typeof heroMark.type).toBe('function')
    const heroImage = (heroMark.type as (props: Record<string, unknown>) => unknown)(
      heroMark.props
    ) as { type: unknown; props: Record<string, unknown> }
    expect(heroImage.type).toBe('img')
    expect(heroImage.props.src).toBe('/dsh-desktop-logo-dark.png')
    expect(heroImage.props.width).toBe(48)
    expect(heroImage.props.height).toBe(48)

    const heroCopy = registrations.find(
      ({ config }) => config.name === 'conversation.hero.brand.content'
    )!.component({ t: translate }) as { type: unknown; props: Record<string, unknown> }
    expect(heroCopy.type).toBe('span')
    const children = heroCopy.props.children as Array<{ props: { children: unknown[] } }>
    expect(children.map((child) => child.props.children[0])).toEqual([
      'What will you accomplish today?',
      'Describe the goal, choose a workspace and mode, then begin.'
    ])
  })
})
