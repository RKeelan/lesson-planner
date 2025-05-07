import { useEffect, useState } from 'react';
import { getAccessToken, signOut } from '../services/googleAuth';

interface GoogleAuthButtonProps {
  className?: string;
}

export function GoogleAuthButton({ className = '' }: GoogleAuthButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check if we have a token on component mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Just check if there's a cached token without triggering auth flow
        const token = localStorage.getItem('google_auth_token');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };

    checkToken();
  }, []);

  const handleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await getAccessToken(); // This will trigger the auth flow if needed
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setIsAuthenticated(false);
  };

  return (
    <button
      onClick={isAuthenticated ? handleSignOut : handleSignIn}
      disabled={isAuthenticating}
      className={`rounded-lg px-4 py-2 text-black transition-colors duration-200 ${isAuthenticating ? 'bg-gray-400 cursor-not-allowed' : isAuthenticated ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-200 hover:bg-blue-300'} ${className}`}
    >
      {isAuthenticating ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Authenticating...
        </div>
      ) : isAuthenticated ? (
        'Sign Out'
      ) : (
        'Sign In with Google'
      )}
    </button>
  );
}

export default GoogleAuthButton; 