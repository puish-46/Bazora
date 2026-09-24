import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const NavigationContext = createContext(null);

const parseHash = (hash) => {
  if (!hash || hash === "#" || hash === "#/") {
    return { path: "/", queryString: "" };
  }

  let clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean.startsWith("/")) clean = "/" + clean;

  const questionMarkIndex = clean.indexOf("?");
  let path = clean;
  let queryString = "";

  if (questionMarkIndex !== -1) {
    path = clean.slice(0, questionMarkIndex);
    queryString = clean.slice(questionMarkIndex + 1);
  }

  // Strip trailing slash if longer than 1 char
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return { path, queryString };
};

export function NavigationProvider({ children }) {
  const [navState, setNavState] = useState(() =>
    parseHash(window.location.hash)
  );

  useEffect(() => {
    const handleHashChange = () => {
      setNavState(parseHash(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = useCallback((path, queryParams = null) => {
    let target = path.startsWith("/") ? path : `/${path}`;

    if (queryParams && typeof queryParams === "object") {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        target = `${target}?${qs}`;
      }
    }

    window.location.hash = `#${target}`;
  }, []);

  const queryParams = useMemo(() => {
    return new URLSearchParams(navState.queryString);
  }, [navState.queryString]);

  const value = {
    currentPath: navState.path,
    queryString: navState.queryString,
    queryParams,
    fullPath: navState.queryString ? `${navState.path}?${navState.queryString}` : navState.path,
    navigate,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
