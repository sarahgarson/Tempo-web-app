import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      console.log('Auth Callback Mounted');
      const token = searchParams.get('token');
      const role = searchParams.get('role');

      console.log('Full URL:', window.location.href);
      console.log('All Search Params:', Object.fromEntries(searchParams.entries()));
      console.log('Token:', token);
      console.log('Role:', role);

      if (token && role) {
        console.log('Setting credentials and redirecting...');
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);

        const redirectPath = role === 'manager' ? '/manager-schedule' : '/employee-schedule';
        console.log('Redirecting to:', redirectPath);
        
        // Force a small delay to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsProcessing(false);
        navigate(redirectPath, { replace: true });
      } else {
        console.log('Missing token or role');
        setIsProcessing(false);
        navigate('/login', { replace: true });
      }
    };

    handleAuth();
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh' 
    }}>
      <h2>Completing authentication...</h2>
      <p>Please wait while we process your login.</p>
      {isProcessing && <div>Processing...</div>}
    </div>
  );
};

export default AuthCallback;
