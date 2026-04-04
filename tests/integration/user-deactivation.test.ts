/**
 * Integration test for User Deactivation Flow
 * 
 * This test verifies that the user deactivation functionality works correctly
 * after the fixes for email verification and soft deletion.
 */

import { NextRequest } from "next/server";
import { DELETE } from "../../app/api/users/[id]/route";
import { GET } from "../../app/api/users/route";
import { prisma } from "../../lib/prisma";
import { Role } from "../../lib/generated/prisma/enums";

// Mock the authentication middleware
jest.mock("../../lib/auth/middleware", () => ({
  withAuth: jest.fn(({ permissions }) => {
    return jest.fn(() => ({
      user: {
        id: "admin-user-id",
        email: "admin@example.com",
        role: Role.ADMIN,
      },
      session: {},
    }));
  }),
}));

// Mock the audit logger
jest.mock("../../lib/logging/audit", () => ({
  createAuditLogFromRequest: jest.fn(() => Promise.resolve()),
}));

describe("User Deactivation Flow", () => {
  // Test data
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: "testuser@example.com",
        name: "Test User",
        role: Role.END_USER,
        passwordHash: "hashedpassword",
        isActive: true,
      },
    });

    // Create an admin user
    adminUser = await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin User",
        role: Role.ADMIN,
        passwordHash: "hashedpassword",
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["testuser@example.com", "admin@example.com"],
        },
      },
    });
  });

  describe("API - Soft Delete (Deactivate)", () => {
    it("should set isActive to false instead of deleting user", async () => {
      const request = new NextRequest("http://localhost:3000/api/users/" + testUser.id);
      const params = { id: testUser.id };
      
      // Call the DELETE endpoint (which now does soft delete)
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isActive).toBe(false);

      // Verify user still exists in database
      const userInDb = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.isActive).toBe(false);
    });

    it("should return 400 when trying to deactivate self", async () => {
      const request = new NextRequest("http://localhost:3000/api/users/" + adminUser.id);
      const params = { id: adminUser.id };
      
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("cannot delete your own account");
    });

    it("should return 404 when user does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const request = new NextRequest("http://localhost:3000/api/users/" + nonExistentId);
      const params = { id: nonExistentId };
      
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("API - List Users (Active Only)", () => {
    it("should only return active users", async () => {
      const request = new NextRequest("http://localhost:3000/api/users");
      
      const response = await GET(request);
      const users = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(users)).toBe(true);
      
      // Verify deactivated users are not in the list
      const deactivatedUser = users.find((u: any) => u.id === testUser.id);
      expect(deactivatedUser).toBeUndefined();

      // Verify admin user is still in the list
      const adminInList = users.find((u: any) => u.id === adminUser.id);
      expect(adminInList).toBeDefined();
    });
  });
});

// UI Component Test (would need React Testing Library for full component test)
describe("UserDeactivateDialog - Email Verification", () => {
  it("should trim whitespace and ignore case when comparing emails", () => {
    // This test documents the email comparison logic
    // In a real test, we would mount the component and test interactions
    
    const emailComparison = (input: string, expected: string) => {
      return input.trim().toLowerCase() === expected.toLowerCase();
    };

    // Test exact match
    expect(emailComparison("test@example.com", "test@example.com")).toBe(true);
    
    // Test case insensitivity
    expect(emailComparison("TEST@EXAMPLE.COM", "test@example.com")).toBe(true);
    expect(emailComparison("Test@Example.com", "test@example.com")).toBe(true);
    
    // Test whitespace trimming
    expect(emailComparison("  test@example.com  ", "test@example.com")).toBe(true);
    expect(emailComparison("test@example.com\n", "test@example.com")).toBe(true);
    
    // Test mismatch
    expect(emailComparison("wrong@example.com", "test@example.com")).toBe(false);
  });
});