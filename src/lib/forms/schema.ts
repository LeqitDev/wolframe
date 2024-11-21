import { z } from "zod";

export const newProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullable(),
    ownerId: z.string().optional(),
    teamId: z.string().optional(),
    isPublic: z.boolean().default(false),
});

export type NewProjectSchema = typeof newProjectSchema;