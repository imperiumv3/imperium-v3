import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", margin: 0 }}>404</h1>
        <p style={{ opacity: 0.7 }}>This page doesn't exist.</p>
        <a href="/" style={{ textDecoration: "underline" }}>Go home</a>
      </div>
    ),
  });

  return router;
};
