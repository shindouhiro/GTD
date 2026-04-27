import { TanStackDevtools } from '@tanstack/react-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export const Route = createRootRoute({
  component: () => (
    <>
      <div id="global-language-switcher" className="fixed right-3 top-3 z-50 md:right-4 md:top-4">
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
  ),
})
