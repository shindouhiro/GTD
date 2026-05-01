import { TanStackDevtools } from '@tanstack/react-devtools'
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

function RootShell() {
  const router = useRouter()

  useEffect(() => {
    const sendHomeCommand = (command: string) => {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gtd-home-menu-command', { detail: command }))
      }, 0)
    }

    const handleMenuCommand = async (event: Event) => {
      const command = (event as CustomEvent<string>).detail

      switch (command) {
        case 'nav:home':
          await router.navigate({ to: '/' })
          break
        case 'nav:categories':
          await router.navigate({ to: '/categories' })
          break
        case 'nav:statistics':
          await router.navigate({ to: '/statistics' })
          break
        case 'nav:settings':
          await router.navigate({ to: '/settings' })
          break
        case 'view:calendar':
          await router.navigate({ to: '/' })
          sendHomeCommand('view:calendar')
          break
        case 'view:table':
          await router.navigate({ to: '/' })
          sendHomeCommand('view:table')
          break
        case 'view:refresh':
          sendHomeCommand('refresh')
          break
      }
    }

    window.addEventListener('gtd-menu-command', handleMenuCommand)

    return () => {
      window.removeEventListener('gtd-menu-command', handleMenuCommand)
    }
  }, [router])

  return (
    <>
      <div id="global-controls" className="fixed right-3 top-3 z-50 md:right-4 md:top-4 flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <Outlet />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  )
}

export const Route = createRootRoute({
  component: RootShell,
})
