import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    const role = query.get("role");

    if (token && role) {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      // Redirect based on role of the user logging in
      const path = role === "manager" ? "/manager-schedule" : "/employee-schedule";
      navigate(path, { replace: true });
    }
  }, [location, navigate]);

  return <div>Processing authentication...</div>;
}

export default AuthCallback;



