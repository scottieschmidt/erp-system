import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/erp/register")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/register" });
  },
  component: () => null,
});
