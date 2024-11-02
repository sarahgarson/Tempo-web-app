import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');

    if (token && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);

      // Redirect based on role
      const redirectPath = role === 'manager' ? '/manager-schedule' : '/employee-schedule';
      navigate(redirectPath, { replace: true });
    }
  }, [searchParams, navigate]);

  return <div>Completing authentication...</div>;
};

export default AuthCallback;





