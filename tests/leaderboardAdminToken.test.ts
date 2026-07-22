// @vitest-environment jsdom
/**
 * Regression coverage for the 2026-07-19 audit fix: the leaderboard admin
 * token must live in sessionStorage (cleared when the tab closes), not
 * localStorage — it's a manually-pasted admin credential, not meant to
 * persist indefinitely and widen the app's XSS blast radius.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLeaderboardAdminToken,
  hasLocalLeaderboardAdminToken,
  loadLeaderboardAdminToken,
  saveLeaderboardAdminToken,
} from "@/lib/leaderboard";

const KEY = "noor_lb_admin_token_v1";

describe("leaderboard admin token storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("defaults to empty when nothing is stored", () => {
    expect(loadLeaderboardAdminToken()).toBe("");
    expect(hasLocalLeaderboardAdminToken()).toBe(false);
  });

  it("saves and loads the token via sessionStorage", () => {
    saveLeaderboardAdminToken("  secret-token-123  ");
    expect(loadLeaderboardAdminToken()).toBe("secret-token-123");
    expect(sessionStorage.getItem(KEY)).toBe("secret-token-123");
  });

  it("never writes the admin token to localStorage", () => {
    saveLeaderboardAdminToken("secret-token-123");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("clearing an empty token removes any stored value", () => {
    saveLeaderboardAdminToken("x");
    saveLeaderboardAdminToken("");
    expect(loadLeaderboardAdminToken()).toBe("");
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("clearLeaderboardAdminToken removes the stored token", () => {
    saveLeaderboardAdminToken("secret-token-123");
    clearLeaderboardAdminToken();
    expect(loadLeaderboardAdminToken()).toBe("");
  });
});
