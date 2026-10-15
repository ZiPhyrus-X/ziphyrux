import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../server/db";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import type { AuthenticatedUser } from "../server/types";
import { addDays, subDays } from "date-fns";

const editorUser: AuthenticatedUser = {
  id: "d0000000-0000-0000-0000-000000000002",
  loginId: "editor1@ziphyrus.in",
  email: "editor1@ziphyrus.in",
  name: "Lead Editor",
  role: "editor",
  isProtected: true,
  permissions: ["content.edit", "course.manage", "assessment.manage", "notification.manage"],
};

const coordinatorUser: AuthenticatedUser = {
  id: "d0000000-0000-0000-0000-000000000003",
  loginId: "coord1@smp101.edu",
  email: "coord1@smp101.edu",
  name: "Campus Coordinator",
  role: "coordinator",
  collegeCode: "SMP101",
  collegeId: "col-smp101",
  permissions: ["college.manage"],
};

describe("Notification Lifetime, Auto-Expiration, and Deletion Architecture", () => {
  beforeEach(() => {
    // Reset seed notifications before each test
    const now = new Date();
    db.notifications = [
      {
        id: "seed-notif-1",
        title: "Platform Scheduled Maintenance",
        message: "Maintenance window scheduled for this weekend.",
        targetRole: "All",
        status: "sent",
        sentAt: now.toISOString(),
        durationDays: 7,
        expiresAt: addDays(now, 7).toISOString(),
      },
      {
        id: "seed-notif-2",
        title: "Campus SMP101 Lab Relocation",
        message: "Session moved to Lab 3.",
        targetRole: "Coordinators",
        collegeScope: "SMP101",
        status: "sent",
        sentAt: now.toISOString(),
        durationDays: 3,
        expiresAt: addDays(now, 3).toISOString(),
      },
    ];
  });

  describe("1. Notification Creation & Lifetime (durationDays) Validation", () => {
    it("creates a notification with explicit lifetime durationDays and calculates expiresAt", async () => {
      const created = await db.createNotification({
        title: "Quarterly Hackathon Registration",
        message: "Registrations open for all students for 4 days.",
        targetRole: "Students",
        durationDays: 4,
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe("Quarterly Hackathon Registration");
      expect(created.durationDays).toBe(4);
      expect(created.expiresAt).toBeDefined();

      const sentTime = new Date(created.sentAt).getTime();
      const expiryTime = new Date(created.expiresAt).getTime();
      const diffDays = Math.round((expiryTime - sentTime) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(4);
    });

    it("defaults lifetime to 7 days if durationDays is not provided or invalid", async () => {
      const created = await db.createNotification({
        title: "Default Lifetime Notice",
        message: "Notice with default 7 days duration.",
        targetRole: "All",
      });

      expect(created.durationDays).toBe(7);
      const diffDays = Math.round(
        (new Date(created.expiresAt).getTime() - new Date(created.sentAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(7);
    });

    it("clamps negative or zero durationDays to at least 1 day", async () => {
      const created = await db.createNotification({
        title: "Clamped Lifetime Notice",
        message: "Testing minimum 1 day clamp.",
        targetRole: "All",
        durationDays: -5,
      });

      expect(created.durationDays).toBe(1);
    });
  });

  describe("2. Auto-Expiration: Removing Notifications After Mentioned Days", () => {
    it("returns active notifications before expiration date", () => {
      const active = db.getNotifications();
      expect(active.some((n) => n.id === "seed-notif-1")).toBe(true);
      expect(active.some((n) => n.id === "seed-notif-2")).toBe(true);
    });

    it("automatically removes expired notifications when reference date exceeds durationDays", () => {
      // Advance time by 4 days: seed-notif-2 (3 days lifetime) must be removed!
      const fourDaysLater = addDays(new Date(), 4);
      const notifsAfter4Days = db.getNotifications({ referenceDate: fourDaysLater });

      expect(notifsAfter4Days.some((n) => n.id === "seed-notif-2")).toBe(false);
      expect(notifsAfter4Days.some((n) => n.id === "seed-notif-1")).toBe(true); // 7 days lifetime still active
    });

    it("removes all notifications once their respective lifetimes expire", () => {
      // Advance time by 8 days: both seed-notif-1 (7d) and seed-notif-2 (3d) must be expired
      const eightDaysLater = addDays(new Date(), 8);
      const notifsAfter8Days = db.getNotifications({ referenceDate: eightDaysLater });

      expect(notifsAfter8Days.length).toBe(0);
    });

    it("purgeExpiredNotifications permanently cleans expired records from store", () => {
      const fiveDaysLater = addDays(new Date(), 5);
      expect(db.notifications.length).toBe(2);

      db.purgeExpiredNotifications(fiveDaysLater);
      // seed-notif-2 expired (3 days) -> permanently purged
      expect(db.notifications.length).toBe(1);
      expect(db.notifications[0].id).toBe("seed-notif-1");
    });
  });

  describe("3. Manual Deletion of Notifications", () => {
    it("deletes a notification permanently and records an audit log entry", async () => {
      expect(db.notifications.some((n) => n.id === "seed-notif-1")).toBe(true);

      const res = await db.deleteNotification("seed-notif-1", "editor@ziphyrus.edu");
      expect(res.success).toBe(true);
      expect(res.id).toBe("seed-notif-1");
      expect(db.notifications.some((n) => n.id === "seed-notif-1")).toBe(false);

      // Verify audit log
      const audit = db.auditLogs.find(
        (a) => a.action === "notification.delete" && a.target === "Platform Scheduled Maintenance"
      );
      expect(audit).toBeDefined();
      expect(audit?.actor).toBe("editor@ziphyrus.edu");
    });

    it("throws an error when attempting to delete a non-existent notification", async () => {
      await expect(db.deleteNotification("non-existent-id")).rejects.toThrow("Notification 'non-existent-id' not found.");
    });
  });

  describe("4. End-to-End API Routes Connectivity", () => {
    const editorHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${createSessionToken(editorUser)}`,
    };

    const coordHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${createSessionToken(coordinatorUser)}`,
    };

    it("POST /api/v1/editor/notifications creates notification with custom durationDays", async () => {
      const req = new Request("http://localhost/api/v1/editor/notifications", {
        method: "POST",
        headers: editorHeaders,
        body: JSON.stringify({
          title: "API Broadcast with Lifetime",
          message: "Broadcast message for 5 days.",
          targetRole: "all",
          durationDays: 5,
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.durationDays).toBe(5);
      expect(json.data.expiresAt).toBeDefined();
    });

    it("DELETE /api/v1/editor/notifications/:id deletes notification via API", async () => {
      const req = new Request("http://localhost/api/v1/editor/notifications/seed-notif-2", {
        method: "DELETE",
        headers: editorHeaders,
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(db.notifications.some((n) => n.id === "seed-notif-2")).toBe(false);
    });

    it("GET /api/v1/notifications returns notifications with role and college scope filtering", async () => {
      const req = new Request("http://localhost/api/v1/notifications?collegeScope=SMP101&role=coordinator", {
        method: "GET",
        headers: coordHeaders,
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      // Both seed-notif-1 (All) and seed-notif-2 (Coordinators @ SMP101) match
      expect(json.data.length).toBe(2);
    });

    it("DELETE /api/v1/notifications/:id allows authenticated deletion from notification bell", async () => {
      const req = new Request("http://localhost/api/v1/notifications/seed-notif-1", {
        method: "DELETE",
        headers: editorHeaders,
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(db.notifications.some((n) => n.id === "seed-notif-1")).toBe(false);
    });

    it("DELETE /api/v1/coordinator/notifications/:id allows coordinator to delete announcements", async () => {
      const req = new Request("http://localhost/api/v1/coordinator/notifications/seed-notif-2", {
        method: "DELETE",
        headers: coordHeaders,
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(db.notifications.some((n) => n.id === "seed-notif-2")).toBe(false);
    });
  });
});
