import type { PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useCurrentSession } from '@/entities/session'
import { LogoutButton } from '@/features/auth-logout'
import { PublicationStatus } from '@/features/publish-site'
import { siteNavigation } from '@/shared/routes'
import {
  Container,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/shared/ui'

function Navigation({ canManage }: { canManage: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  return (
    <SidebarContent>
      <SidebarMenu>
        {siteNavigation
          .filter((item) => item.path === '/' || canManage)
          .map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={pathname === item.path}
                render={
                  <NavLink
                    to={item.path}
                    end
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  />
                }
              >
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    </SidebarContent>
  )
}
export function AppShell({ children }: PropsWithChildren) {
  const { data: user } = useCurrentSession()
  const { pathname } = useLocation()
  const canManage = user.permissions.includes('site.content.manage')
  const label =
    siteNavigation.find((item) => item.path === pathname)?.label ??
    'Управление сайтом'
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <p className="px-2 py-2 text-sm font-semibold">Юля Валишина</p>
          <p className="px-2 pb-3 text-xs text-muted-foreground">
            Управление сайтом
          </p>
        </SidebarHeader>
        <Navigation canManage={canManage} />
        <SidebarFooter>
          <span className="truncate px-2 text-xs text-muted-foreground">
            {user.normalizedEmail}
          </span>
          <LogoutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-3 border-b px-4">
          <SidebarTrigger aria-label="Открыть навигацию" />
          <span className="text-sm font-medium">{label}</span>
        </header>
        <Container className="min-w-0 flex-1 pb-10">
          {canManage && <PublicationStatus />}
          <div className="pt-7">{children}</div>
        </Container>
      </SidebarInset>
    </SidebarProvider>
  )
}
