import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // This instantly moves the scroll to the top-left corner
    window.scrollTo(0, 0);
  }, [pathname]); // This runs every time the URL path changes

  return null;
}