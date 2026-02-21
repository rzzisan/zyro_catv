import { useEffect } from 'react'

/**
 * Custom hook to update the page title dynamically
 * @param {string} title - The title to set for the page
 * @param {string} [suffix='CATV Management'] - Optional suffix for the title
 */
export function usePageTitle(title, suffix = 'CATV Management') {
  useEffect(() => {
    if (title) {
      document.title = suffix ? `${title} - ${suffix}` : title
    }
    
    // Cleanup: reset to default title when component unmounts (optional)
    return () => {
      document.title = suffix || 'CATV Management'
    }
  }, [title, suffix])
}
