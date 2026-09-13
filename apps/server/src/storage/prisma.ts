import { PrismaClient } from "@prisma/client";

// Single shared client for the process — v0 is a single-user local app.
export const prisma = new PrismaClient();
