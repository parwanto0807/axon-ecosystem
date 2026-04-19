import { create } from 'zustand'

interface UIStore {
    isSidebarCollapsed: boolean
    isMobileMenuOpen: boolean
    isPWAInstallPromptActive: boolean
    shouldBlurBackground: boolean
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void
    toggleMobileMenu: () => void
    setMobileMenuOpen: (open: boolean) => void
    setPWAInstallPromptActive: (active: boolean) => void
    setShouldBlurBackground: (blur: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
    isSidebarCollapsed: false,
    isMobileMenuOpen: false,
    isPWAInstallPromptActive: false,
    shouldBlurBackground: false,
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
    setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
    setPWAInstallPromptActive: (active) => set({ isPWAInstallPromptActive: active }),
    setShouldBlurBackground: (blur) => set({ shouldBlurBackground: blur }),
}))
