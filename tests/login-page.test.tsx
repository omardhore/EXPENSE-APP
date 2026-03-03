import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe("LoginPage", () => {
  it("renders the login form", () => {
    render(<LoginPage />);

    expect(
      screen.getByText(/sign in/i, { selector: "[data-slot='card-title']" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
  });
});
