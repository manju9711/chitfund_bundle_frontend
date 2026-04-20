import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  setIsAuthenticated: (value: boolean) => void;
}

export default function Layout({ children, setIsAuthenticated }: LayoutProps) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  // Get user from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/schemes', label: 'Chit Schemes', icon: '💰' },
    { path: '/schedule', label: 'Chit Schedule', icon: '📅' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/reports', label: 'Reports', icon: '📈' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - fixed, does not scroll */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50
          bg-[#1A2634] text-white
          transition-all duration-300 ease-in-out
          flex flex-col shadow-lg flex-shrink-0
          ${sidebarCollapsed ? 'w-[70px]' : 'w-[260px]'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Profile Section at Top */}
        <div className="p-5 border-b border-gray-700 flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-2xl flex-shrink-0">
            👤
          </div>
          {!sidebarCollapsed && (
            <div className="text-center overflow-hidden">
              <div className="font-semibold text-sm whitespace-nowrap">
                {user?.name || 'User'}
              </div>
              <div className="text-xs text-gray-300 whitespace-nowrap">
                {user?.role || 'Admin'}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className="p-2.5 border-b border-gray-700 flex justify-center">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="bg-transparent border-none text-white p-2 rounded cursor-pointer text-xl flex items-center justify-center w-10 h-10 transition-colors hover:bg-[#243447]"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="py-3 flex-1 overflow-y-auto space-y-1">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-5 py-2.5 no-underline
                  transition-all duration-300
                  ${active 
                    ? 'sidebar-link-active font-semibold shadow-md' 
                    : 'sidebar-link text-gray-200 bg-transparent font-normal hover:bg-[#243447] hover:text-white'
                  }
                  ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
                  text-base
                `}
                title={sidebarCollapsed ? item.label : ''}
              >
                <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* Logout Button at Bottom */}
        <div className="p-2.5 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-5 py-3
              bg-transparent border-none text-gray-300 cursor-pointer
              text-base rounded transition-all duration-300
              hover:bg-red-600 hover:text-white
              ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
            `}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <span className="text-xl min-w-[24px] text-center">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Footer in sidebar */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-700 text-[11px] text-gray-400 text-center">
            <p className="m-0">&copy; 2024</p>
          </div>
        )}
      </aside>

      {/* Main Content - only this panel scrolls when content overflows */}
      <main
        className={`
          flex-1 min-w-0 min-h-full overflow-auto bg-[#f4f6fb]
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[260px]'}
        `}
      >
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-5 left-5 z-50 bg-gray-800 text-white p-2.5 rounded-md shadow-lg hover:bg-gray-700 transition-colors w-10 h-10 flex items-center justify-center text-xl"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className="max-w-7xl mx-auto p-5 lg:p-5 pt-5 pl-[72px] lg:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}
