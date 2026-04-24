import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/$",
      params: { _splat: "features" },
      statusCode: 301,
    });
  },
});
