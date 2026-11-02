import { QueryCache, QueryClient, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { statusOf } from "./lib/errors";

function onAuthError(err: unknown) {
  if (typeof window !== "undefined" && statusOf(err) === 401 && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: onAuthError }),
    mutationCache: new MutationCache({ onError: onAuthError }),
    defaultOptions: {
      queries: { retry: (n, e) => statusOf(e) !== 401 && statusOf(e) !== 404 && n < 2, refetchOnWindowFocus: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
