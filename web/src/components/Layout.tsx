import { useState, useEffect } from 'react';
import { AppShell, Burger, Group, NavLink, Text, Title, Button, Avatar, Menu, ActionIcon, Tooltip, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { IconHome, IconUsers, IconBox, IconFileDescription, IconSettings, IconLogout, IconUser, IconBuildingFactory, IconBuildingWarehouse, IconReportAnalytics, IconBusinessplan, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconUserCog, IconSun, IconMoon } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const NAVBAR_WIDTH_OPEN = 280;
const NAVBAR_WIDTH_COLLAPSED = 80;

export function Layout() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const toggleColorScheme = () => { setColorScheme(isDark ? 'light' : 'dark'); };
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopCollapsed, setDesktopCollapsed] = useLocalStorage({ key: 'sgi-sidebar-collapsed', defaultValue: false, });
  const [openedSections, setOpenedSections] = useState<string[]>([]);
  const { logout, user, can, settings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: IconHome, path: '/dashboard' },
    { label: 'Orçamentos', icon: IconFileDescription, path: '/quotes', permission: 'quotes.view' },
    { label: 'Produção', icon: IconBuildingFactory, path: '/production', permission: 'production_orders.view' },
    { label: 'Produtos', icon: IconBox, path: '/products', permission: 'products.view' },
    { label: 'Estoque', icon: IconBuildingWarehouse, path: '/stock', permission: 'stock.manage' },
    { label: 'Clientes', icon: IconUsers, path: '/customers', permission: 'customers.view' },
    { label: 'Relatórios', icon: IconReportAnalytics, path: '/reports', permission: 'reports.view' },
    { label: 'Financeiro', icon: IconBusinessplan, path: '/finance', permission: 'finance.view_receivables',
      children: [
        { label: 'Contas a Receber', path: '/accounts-receivable', permission: 'finance.view_receivables' },
        { label: 'Contas a Pagar', path: '/accounts-payable', permission: 'finance.view_payables' },
      ]
    },
  ];

  useEffect(() => {
    navItems.forEach(item => {
      if (item.children && item.children.some(child => location.pathname.startsWith(child.path))) {
        setOpenedSections(current => [...current, item.path]);
      }
    });
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleSection = (path: string) => {
    setOpenedSections(current => 
      current.includes(path) 
      ? current.filter(p => p !== path) 
      : [...current, path]
    );
  };

  const RenderNavItem = (item: any) => {
    if (item.permission && !can(item.permission)) return null;
    const hasChildren = item.children && item.children.length > 0;
    const isSectionOpen = openedSections.includes(item.path);
    const linkContent = (
      <NavLink key={item.path} label={desktopCollapsed ? "" : item.label} leftSection={<item.icon size={20} stroke={1.5} />} active={isActive(item.path)} opened={!desktopCollapsed && isSectionOpen}
      styles={desktopCollapsed ? { root: { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 }, section: { marginRight: 0 }, body: { display: 'none' } } : undefined }
      onClick={() => { if (!hasChildren) { navigate(item.path); if (mobileOpened) toggleMobile(); } else { if (desktopCollapsed) { setDesktopCollapsed(false); if (!isSectionOpen) toggleSection(item.path); }
      else { toggleSection(item.path); } } }} variant="filled" color="blue" >
      {!desktopCollapsed && hasChildren && item.children.map((child: any) => (
        (child.permission && !can(child.permission)) ? null : ( <NavLink key={child.path} label={child.label} active={location.pathname === child.path} onClick={(e) => { e.stopPropagation(); navigate(child.path); if (mobileOpened) toggleMobile(); }} />
      )))}
      </NavLink>
    );
    if (desktopCollapsed) {
      return (<Tooltip label={item.label} position="right" key={item.path} transitionProps={{ duration: 0 }}>{linkContent}</Tooltip>);
    }
    return linkContent;
  };

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: desktopCollapsed ? NAVBAR_WIDTH_COLLAPSED : NAVBAR_WIDTH_OPEN, breakpoint: 'sm', collapsed: { mobile: !mobileOpened }, }} padding="md" styles={{ navbar: { transition: 'width 0.3s ease' }, main: { transition: 'padding-left 0.3s ease' } }} >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            {settings?.logo_path ? (
              <img src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${settings.logo_path}`} alt="Logo" style={{ maxHeight: 40 }} />
            ) : (
            <Title order={3}>{settings?.company_fantasy_name || 'SGI'}</Title>
            )}
          </Group>

          <Group gap="xs">
            <ActionIcon onClick={toggleColorScheme} variant="default" size="lg" aria-label="Alternar tema" >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} /> }
            </ActionIcon>
          
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="subtle" color="gray" leftSection={<Avatar src={null} alt={user?.name} radius="xl" color="blue">{user?.name?.charAt(0)}</Avatar>}>
                  <Text visibleFrom="xs">{user?.name}</Text>
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Minha Conta</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/profile')}>Meu Perfil</Menu.Item>
                {can('users.manage') && (
                  <Menu.Item leftSection={<IconUserCog size={14} />} onClick={() => navigate('/users')}>Gestão de Usuários</Menu.Item>
                )}
                {can('settings.manage') && (
                  <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate('/settings')}>Configurações da Empresa</Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={logout}>Sair</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <AppShell.Section grow>{navItems.map(item => RenderNavItem(item))}</AppShell.Section>
        <AppShell.Section p="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', }} >
          <Group justify={desktopCollapsed ? 'center' : 'space-between'} wrap="nowrap">
            {!desktopCollapsed && ( <div style={{ overflow: 'hidden' }}>
              <Text size="xs" fw={700} c="dimmed" style={{ lineHeight: 1.2 }}>SGI v0.1.8</Text>
              <Text size="xs" c="dimmed" style={{ fontSize: 10, lineHeight: 1.2 }}>by Drav Dev</Text>
            </div> )}
            <Tooltip label={desktopCollapsed ? "Expandir Menu" : "Recolher Menu"} position="right" withArrow transitionProps={{ duration: 0 }} >
              <ActionIcon variant="subtle" color="gray" onClick={() => setDesktopCollapsed(!desktopCollapsed)}>{desktopCollapsed ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}</ActionIcon>
            </Tooltip>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg={isDark ? 'dark.8' : 'gray.0'}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}