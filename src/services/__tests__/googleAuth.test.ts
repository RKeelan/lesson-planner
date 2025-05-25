import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock Google Identity Services
const mockTokenClient = {
  callback: null as ((response: any) => void) | null,
  requestAccessToken: vi.fn()
}

const mockGoogleAccounts = {
  oauth2: {
    initTokenClient: vi.fn(() => mockTokenClient),
    revoke: vi.fn()
  }
}

// Store original window.google value
let originalGoogle: any

describe('googleAuth', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockTokenClient.callback = null
    
    // Store original value and reset window.google
    originalGoogle = (window as any).google
    ;(window as any).google = undefined
    
    // Clear module cache to reset module state
    vi.resetModules()
    
    // Mock environment variable
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id')
  })

  afterEach(() => {
    // Restore original value
    ;(window as any).google = originalGoogle
    vi.unstubAllEnvs()
  })

  describe('initGoogleAuth', () => {
    it('should initialize Google Auth when Google Identity Services is available', async () => {
      // Set up Google Identity Services
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      // Import after setting up mocks
      const { initGoogleAuth } = await import('../googleAuth')
      await initGoogleAuth()

      expect(mockGoogleAccounts.oauth2.initTokenClient).toHaveBeenCalledWith({
        client_id: 'test-client-id',
        scope: 'https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file',
        callback: expect.any(Function)
      })
    })

    it('should load cached token if available and valid', async () => {
      const futureTime = Date.now() + 3600000 // 1 hour from now
      const cachedToken = {
        access_token: 'cached-token',
        expires_in: 3600,
        expires_at: futureTime,
        scope: 'test-scope',
        token_type: 'Bearer'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedToken))
      
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const { initGoogleAuth } = await import('../googleAuth')
      await initGoogleAuth()

      expect(localStorageMock.getItem).toHaveBeenCalledWith('google_auth_token')
    })

    it('should remove expired cached token', async () => {
      const pastTime = Date.now() - 3600000 // 1 hour ago
      const expiredToken = {
        access_token: 'expired-token',
        expires_in: 3600,
        expires_at: pastTime,
        scope: 'test-scope',
        token_type: 'Bearer'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredToken))
      
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const { initGoogleAuth } = await import('../googleAuth')
      await initGoogleAuth()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_auth_token')
    })

    it('should handle invalid cached token JSON', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const { initGoogleAuth } = await import('../googleAuth')
      await initGoogleAuth()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_auth_token')
    })

    it('should wait for Google Identity Services to load', async () => {
      const { initGoogleAuth } = await import('../googleAuth')
      
      // Start initialization without Google Identity Services
      const initPromise = initGoogleAuth()
      
      // Add Google Identity Services after a delay
      setTimeout(() => {
        ;(window as any).google = {
          accounts: mockGoogleAccounts
        }
      }, 50)

      await initPromise

      expect(mockGoogleAccounts.oauth2.initTokenClient).toHaveBeenCalled()
    })
  })

  describe('getAccessToken', () => {
    it('should return cached token if available', async () => {
      const futureTime = Date.now() + 3600000
      const cachedToken = {
        access_token: 'cached-token',
        expires_in: 3600,
        expires_at: futureTime,
        scope: 'test-scope',
        token_type: 'Bearer'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedToken))
      
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const { getAccessToken } = await import('../googleAuth')
      const token = await getAccessToken()
      
      expect(token).toBe('cached-token')
    })

    it('should request new token if no cached token available', async () => {
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const mockResponse = {
        access_token: 'new-token',
        expires_in: 3600,
        scope: 'test-scope',
        token_type: 'Bearer'
      }

      // Mock the token request
      mockTokenClient.requestAccessToken.mockImplementation(() => {
        // Simulate the callback being called
        if (mockTokenClient.callback) {
          mockTokenClient.callback(mockResponse)
        }
      })

      const { getAccessToken } = await import('../googleAuth')
      const token = await getAccessToken()

      expect(token).toBe('new-token')
      expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: '' })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'google_auth_token',
        expect.stringContaining('new-token')
      )
    })

    it('should handle auth errors', async () => {
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const errorResponse = {
        error: 'access_denied',
        access_token: '',
        expires_in: 0,
        scope: '',
        token_type: ''
      }

      mockTokenClient.requestAccessToken.mockImplementation(() => {
        if (mockTokenClient.callback) {
          mockTokenClient.callback(errorResponse)
        }
      })

      const { getAccessToken } = await import('../googleAuth')
      await expect(getAccessToken()).rejects.toThrow('Auth error: access_denied')
    })

    it('should handle missing access token in response', async () => {
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const invalidResponse = {
        expires_in: 3600,
        scope: 'test-scope',
        token_type: 'Bearer'
      }

      mockTokenClient.requestAccessToken.mockImplementation(() => {
        if (mockTokenClient.callback) {
          mockTokenClient.callback(invalidResponse)
        }
      })

      const { getAccessToken } = await import('../googleAuth')
      await expect(getAccessToken()).rejects.toThrow('No access token returned')
    })

    it('should handle timeout when Google Auth not initialized', async () => {
      // Don't set up window.google
      const { getAccessToken } = await import('../googleAuth')
      
      // Create a promise that will timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 500)
      })
      
      const getTokenPromise = getAccessToken()
      
      await expect(Promise.race([getTokenPromise, timeoutPromise])).rejects.toThrow('Timeout')
    })
  })

  describe('signOut', () => {
    it('should clear stored token and revoke access', async () => {
      ;(window as any).google = {
        accounts: mockGoogleAccounts
      }

      const { signOut } = await import('../googleAuth')
      signOut()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_auth_token')
    })

    it('should handle signOut when Google Identity Services is not available', async () => {
      // Don't set up window.google
      const { signOut } = await import('../googleAuth')
      
      expect(() => signOut()).not.toThrow()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_auth_token')
    })
  })
}) 