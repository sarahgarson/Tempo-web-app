import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthCallback mounted');
    console.log('Current location:', location);
    
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    const role = query.get("role");
    
    console.log('Token:', token);
    console.log('Role:', role);

    if (token && role) {
      console.log('Setting credentials');
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      
      const path = role === "manager" ? "/manager-schedule" : "/employee-schedule";
      console.log('Navigating to:', path);
      navigate(path, { replace: true });
    }
  }, [location, navigate]);

  return <div>Processing authentication...</div>;
}

export default AuthCallback;



