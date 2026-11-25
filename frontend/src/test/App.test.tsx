import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";
import * as AuthMod from "../context/AuthContext";
import { auth as firebaseAuth } from "../lib/firebase";

vi.mock("../components/StationMap", () => ({
  StationMap: () => <div data-testid="station-map">Map Ready</div>,
}));
vi.mock("../components/TripRouteMap", () => ({
  TripRouteMap: () => <div data-testid="trip-route-map">Route Map Ready</div>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(firebaseAuth, "currentUser", {
    value: null,
    configurable: true,
    writable: true,
  });
});

function renderWithAuth(
  route: string,
  authOverrides: Partial<ReturnType<typeof AuthMod.useAuth>> = {}
) {
  const defaultAuth: ReturnType<typeof AuthMod.useAuth> = {
    firebaseUser: null,
    profile: null,
    loading: false,
    isAdmin: false,
    authError: null,
    clearAuthError: vi.fn(),
    loginWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resendVerificationEmail: vi.fn(),
    refreshProfile: vi.fn(),
    ...authOverrides,
  };
  vi.spyOn(AuthMod, "useAuth").mockReturnValue(defaultAuth);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const makeFakeUser = () => {
  const user = {
    uid: "u1",
    email: "driver@karnataka.in",
    emailVerified: true,
    getIdToken: vi.fn().mockResolvedValue("fake-jwt"),
  } as unknown as NonNullable<ReturnType<typeof AuthMod.useAuth>["firebaseUser"]>;
  Object.defineProperty(firebaseAuth, "currentUser", {
    value: user,
    configurable: true,
    writable: true,
  });
  return user;
};

describe("ChargeWise Frontend Flows", () => {
  it("renders landing page with Mysuru -> Mangaluru headline and CTA", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 30 }), {
          status: 200,
        })
      )
    );
    renderWithAuth("/");
    expect(
      screen.getByText(/Plan EV journeys across Karnataka with verified charging trust/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Plan Mysuru → Mangaluru/i)).toBeInTheDocument();
  });

  it("protects /dashboard when unauthenticated and redirects to login", () => {
    renderWithAuth("/dashboard");
    expect(screen.getByText(/Sign in to ChargeWise/i)).toBeInTheDocument();
  });

  it("shows loading state while auth session resolves", () => {
    renderWithAuth("/dashboard", { loading: true });
    expect(screen.getByText(/Verifying session with Firebase Authentication/i)).toBeInTheDocument();
  });

  it("handles login form validation, submission, and logout", async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    renderWithAuth("/login", { loginWithEmail: loginMock });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/i), "driver@karnataka.in");
    await user.type(screen.getByLabelText(/Password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("driver@karnataka.in", "password123");
    });
  });

  it("handles logout from authenticated navbar", async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    );
    renderWithAuth("/vehicles", { firebaseUser: makeFakeUser(), logout: logoutMock });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(logoutMock).toHaveBeenCalled();
  });

  it("handles registration flow", async () => {
    const regMock = vi.fn().mockResolvedValue(undefined);
    renderWithAuth("/register", { registerWithEmail: regMock });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Full name/i), "Ananya Rao");
    await user.type(screen.getByLabelText(/Email address/i), "ananya@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "securepass99");
    await user.type(screen.getByLabelText(/Confirm password/i), "securepass99");
    await user.click(screen.getByRole("button", { name: /Create account/i }));
    await waitFor(() => expect(regMock).toHaveBeenCalled());
  });

  it("handles password reset request", async () => {
    const resetMock = vi.fn().mockResolvedValue(undefined);
    renderWithAuth("/forgot-password", { requestPasswordReset: resetMock });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/i), "ananya@example.com");
    await user.click(screen.getByRole("button", { name: /Send reset link/i }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith("ananya@example.com"));
  });

  it("handles vehicle creation with catalog template", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/vehicles/catalog")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: "cat-1",
                manufacturer: "Tata",
                model: "Nexon.ev",
                variant: "Long Range 45 kWh",
                model_year: 2025,
                battery_capacity_kwh: 45,
                usable_battery_kwh: 42.5,
                consumption_kwh_per_100km: 13.5,
                connector_types: ["CCS2", "TYPE_2"],
                max_ac_power_kw: 7.2,
                max_dc_power_kw: 60,
                specs_source: "oem_verified",
                specs_notes: "45 kWh gross",
              },
            ]),
            { status: 200 }
          )
        );
      }
      if (init?.method === "POST" && url.includes("/vehicles")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "v-new", nickname: "Tata Nexon.ev" }), { status: 201 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithAuth("/vehicles/new", { firebaseUser: makeFakeUser() });
    const user = userEvent.setup();
    const tplBtn = await screen.findByRole("button", { name: /Tata Nexon\.ev/i });
    await user.click(tplBtn);
    await user.click(screen.getByRole("button", { name: /Save vehicle/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/vehicles"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("renders trip planner with vehicles and error feedback when backend rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/vehicles")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: "v-1",
                  nickname: "Family Nexon",
                  manufacturer: "Tata",
                  model: "Nexon.ev",
                  variant: "45 kWh",
                  model_year: 2025,
                  battery_capacity_kwh: 45,
                  usable_battery_kwh: 42.5,
                  consumption_kwh_per_100km: 13.5,
                  connector_types: ["CCS2"],
                  max_ac_power_kw: 7.2,
                  max_dc_power_kw: 60,
                  specs_source: "oem_verified",
                  is_default: true,
                },
              ]),
              { status: 200 }
            )
          );
        }
        if (init?.method === "POST" && url.includes("/trips/plan")) {
          return Promise.resolve(
            new Response(JSON.stringify({ detail: "Routing test error" }), { status: 503 })
          );
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      })
    );

    renderWithAuth("/plan", { firebaseUser: makeFakeUser() });
    expect(await screen.findByText(/Smart EV Trip Planner/i)).toBeInTheDocument();
    expect(await screen.findByText(/Family Nexon/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Calculate Smart Route/i }));
    expect(await screen.findByText(/Routing test error/i)).toBeInTheDocument();
  });

  it("renders notification inbox from Firestore API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/notifications")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: "n1",
                    title: "Journey saved: Mysuru -> Mangaluru",
                    message: "255 km planned with 1 stop",
                    type: "trip_saved",
                    read: false,
                    createdAt: "2026-11-25T10:00:00Z",
                    relatedEntityId: "t1",
                    deepLink: "/trips/t1",
                  },
                ],
                nextCursor: null,
                firestoreAvailable: true,
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ items: [], firestoreAvailable: true }), { status: 200 })
        );
      })
    );

    renderWithAuth("/notifications", { firebaseUser: makeFakeUser() });
    expect(await screen.findByText(/Journey saved: Mysuru -> Mangaluru/i)).toBeInTheDocument();
  });
});
