import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="text-6xl mb-4">🐟</div>
        <h1 className="text-5xl font-bold mb-4">404</h1>
        <p className="text-xl text-white/60 mb-6">
          Deze pagina bestaat niet of is verplaatst.
        </p>
        <a
          href="/"
          className="text-sky-400 hover:text-sky-300 underline text-lg"
        >
          Terug naar home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
