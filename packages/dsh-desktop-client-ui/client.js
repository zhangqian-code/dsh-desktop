window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { MenuItemButton } = require('@deepseek-ai/dsh-client-ui-primitives')
    const NS = 'dsh-desktop-client-ui'
    const copy = {
      zh: {
        heroTitle: '今天想完成什么？',
        heroHint: '描述目标，选择工作区与模式，然后开始。'
      },
      en: {
        heroTitle: 'What will you accomplish today?',
        heroHint: 'Describe the goal, choose a workspace and mode, then begin.'
      }
    }

    function DesktopBrandMark({ size: _size, width = 19, height = width, style, ...props } = {}) {
      return React.createElement('img', {
        ...props,
        src: '/dsh-desktop-logo-dark.png',
        width,
        height,
        alt: '',
        'aria-hidden': 'true',
        style: { objectFit: 'contain', ...style }
      })
    }

    function DesktopBrandName() {
      return React.createElement('span', { style: { fontWeight: 650 } }, 'king-dsh')
    }

    function ConversationBrandMark({ size = 30, className, ...props }) {
      return React.createElement(DesktopBrandMark, {
        ...props,
        className: ['dshDesktopHeroMark', className].filter(Boolean).join(' '),
        width: size,
        height: size,
        'data-king-dsh-hero-mark': true
      })
    }

    function ConversationBrandContent({ t }) {
      return React.createElement(
        'span',
        { className: 'dshDesktopHeroCopy', 'data-king-dsh-hero-copy': true },
        React.createElement('span', { className: 'dshDesktopHeroTitle' }, t('heroTitle')),
        React.createElement('span', { className: 'dshDesktopHeroHint' }, t('heroHint'))
      )
    }

    function OpenUnpreviewableFile({ absolutePath, openWorkspacePath }) {
      const [error, setError] = React.useState('')
      const label = document.documentElement.lang?.toLowerCase().startsWith('zh')
        ? '用本地应用打开'
        : 'Open with local app'
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('button', {
          type: 'button',
          'data-textpreview-open-local': true,
          onClick: () => {
            setError('')
            void openWorkspacePath(absolutePath).catch((reason) => {
              setError(reason instanceof Error ? reason.message : String(reason))
            })
          }
        }, label),
        error && React.createElement('span', { role: 'alert' }, error)
      )
    }

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deleteSession }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '永久删除会话' : 'Delete session permanently'
      const warning = chinese
        ? `确定删除“${displayTitle || sessionId}”？工作区文件会保留。此操作无法撤销。`
        : `Delete “${displayTitle || sessionId}”? Workspace files are kept. This can’t be undone.`
      return React.createElement(MenuItemButton, {
        danger: true,
        onSelect: () => {
          setMenuOpen(false)
          if (!window.confirm(warning)) return
          void Promise.resolve().then(() => deleteSession(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function OpenSessionFolderMenuItem({ sessionId, useMenuOpenState, openInFinder }) {
      const [, setMenuOpen] = useMenuOpenState()
      if (typeof window.dshDesktop?.openInFinder !== 'function') return null
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '在文件管理器中打开' : 'Open in file manager'
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          void Promise.resolve().then(() => openInFinder(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function UnreadSessionMenuItem({ sessionId, unread, onUnreadChange, useMenuOpenState }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          onUnreadChange(sessionId, !unread)
        }
      }, unread ? (chinese ? '标为已读' : 'Mark as read') : (chinese ? '标为未读' : 'Mark as unread'))
    }

    const inject = ['slots', 'locale', 'remote.session', 'sessions', 'uiWorkspace']
    function apply(ctx) {
      ctx.effect(() => {
        const disposeLocale = ctx.locale.register(NS, copy)
        const id = 'dsh-desktop-client-ui-style'
        let style
        if (!document.getElementById(id)) {
          style = document.createElement('style')
          style.id = id
          style.textContent = `
          .dshDesktopHeroCopy {
            min-width:0; max-width:min(100%,420px); display:flex; flex-direction:column; align-items:flex-start;
            gap:2px; text-align:left; animation:dshDesktopHeroCopyIn 280ms cubic-bezier(.2,.8,.2,1) both;
          }
          .dshDesktopHeroTitle {
            color:var(--dsw-alias-label-primary); font-size:28px; font-weight:620;
            line-height:34px; letter-spacing:-0.025em;
          }
          .dshDesktopHeroHint {
            color:var(--dsw-alias-label-secondary); font-size:13px; font-weight:400;
            line-height:20px; letter-spacing:0;
          }
          .dshDesktopHeroMark {
            flex:none; object-fit:contain; filter:drop-shadow(0 5px 12px color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent));
            animation:dshDesktopHeroMarkIn 360ms cubic-bezier(.2,.8,.2,1) both;
            transition:transform 160ms ease, filter 160ms ease;
          }
          .dshDesktopHeroMark:hover {
            transform:translateY(-1px) scale(1.04);
            filter:drop-shadow(0 7px 16px color-mix(in srgb, var(--dsw-alias-state-business-primary) 34%, transparent));
          }
          @keyframes dshDesktopHeroCopyIn {
            from { opacity:0; transform:translateY(5px); }
            to { opacity:1; transform:none; }
          }
          @keyframes dshDesktopHeroMarkIn {
            from { opacity:0; transform:translateY(4px) scale(.94); }
            to { opacity:1; transform:none; }
          }
          @media (prefers-reduced-motion:reduce) {
            .dshDesktopHeroCopy, .dshDesktopHeroMark { animation:none; transition:none; }
            .dshDesktopHeroMark:hover { transform:none; }
          }
          [data-dsh-preset-heading] { display:flex; align-items:center; flex-wrap:wrap; gap:12px 16px; }
          [data-dsh-preset-heading] h2 { margin:0; }
          [data-dsh-preset-actions] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:auto; }
          [data-dsh-preset-actions] button { white-space:nowrap; }
          [data-dsh-preset-search] { margin-bottom:16px; }
          [data-dsh-preset-search] input[type=search] {
            box-sizing:border-box; width:100%; min-width:0; height:36px;
            border:1px solid var(--dsw-alias-border-l2); border-radius:10px;
            background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary);
            padding:0 12px; font:inherit; font-size:13px;
          }
          [data-dsh-preset-search] input[type=search]::placeholder { color:var(--dsw-alias-label-caption); }
          [data-dsh-preset-search] input[type=search]:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
            background:var(--dsw-alias-bg-base);
          }
          `
          document.head.appendChild(style)
        }
        return () => {
          style?.remove()
          if (typeof disposeLocale === 'function') disposeLocale()
        }
      })
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', () =>
            ctx.slots.inject('conversation.hero.brand.content', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.content', inject: () => ({ t }) },
              ConversationBrandContent
            )
          }))
        )
      )
      ctx.slots.inject('sidebar.right.tab.document.unpreviewable', () =>
        ctx.slots.register({
          name: 'sidebar.right.tab.document.unpreviewable',
          id: 'desktop-open-local',
          inject: () => ({
            openWorkspacePath: (path) => ctx.remote.session.openWorkspacePath({ path })
          })
        }, OpenUnpreviewableFile)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session',
          order: 900,
          inject: () => ({
            deleteSession: (sessionId) => {
              const workspace = ctx.get('uiWorkspace')
              if (!workspace) throw new Error('Workspace navigation is unavailable')
              return workspace.deleteSession(sessionId)
            }
          })
        }, DeleteSessionMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-open-session-folder',
          order: 800,
          inject: () => ({
            openInFinder: (sessionId) => {
              const cwd = ctx.get('sessions').list.getSnapshot().byId[sessionId]?.cwd
              if (!cwd) throw new Error('Session workspace directory is unavailable')
              return window.dshDesktop.openInFinder(cwd)
            }
          })
        }, OpenSessionFolderMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-unread-session',
          order: 350
        }, UnreadSessionMenuItem)
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
