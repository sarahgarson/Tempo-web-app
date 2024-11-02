import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Auth Callback Mounted');
    const token = searchParams.get('token');
    const role = searchParams.get('role');

    // Add more detailed logging
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
      navigate(redirectPath, { replace: true });
    } else {
      console.log('Missing token or role');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div>
      <h2>Completing authentication...</h2>
      <p>Please wait while we process your login.</p>
    </div>
  );
};

export default AuthCallback;






