import { z } from 'zod';

export const LoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(64, 'Username too long')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid username format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

// Custom validator for safe destination URLs (must be http:// or https://)
export const destinationUrlValidator = z
  .string()
  .trim()
  .max(2048, 'Destination URL too long')
  .refine(
    (url) => {
      if (!url || url === '') return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Destination must be a valid HTTP or HTTPS URL (e.g. https://www.youtube.com/...)' }
  )
  .optional()
  .nullable();

export const CreateInvestigationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be under 500 characters')
    .optional()
    .nullable(),
  destinationUrl: destinationUrlValidator,
});

export const UpdateInvestigationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  destinationUrl: destinationUrlValidator,
  enabled: z.boolean().optional(),
});

export const VisitSubmissionSchema = z.object({
  token: z.string().min(1).max(100),
  consentGiven: z.boolean(),
  locationPermission: z.enum(['granted', 'denied', 'pending', 'unsupported', 'not_prompted']).or(z.string()),
  batteryPermission: z.enum(['granted', 'pending', 'unsupported', 'not_prompted']).or(z.string()),
  // Location
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  accuracy: z.number().min(0).optional().nullable(),
  locationTimestamp: z.number().optional().nullable(),
  // Device
  userAgent: z.string().max(512).optional().nullable(),
  browser: z.string().max(64).optional().nullable(),
  browserVersion: z.string().max(32).optional().nullable(),
  os: z.string().max(64).optional().nullable(),
  osVersion: z.string().max(32).optional().nullable(),
  screenWidth: z.number().int().min(0).max(10000).optional().nullable(),
  screenHeight: z.number().int().min(0).max(10000).optional().nullable(),
  pixelRatio: z.number().min(0).max(10).optional().nullable(),
  language: z.string().max(32).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  platform: z.string().max(64).optional().nullable(),
  deviceType: z.string().max(32).optional().nullable(),
  // Battery
  batteryLevel: z.number().min(0).max(1).optional().nullable(),
  batteryCharging: z.boolean().optional().nullable(),
});

export const DateFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateInvestigationInput = z.infer<typeof CreateInvestigationSchema>;
export type UpdateInvestigationInput = z.infer<typeof UpdateInvestigationSchema>;
export type VisitSubmissionInput = z.infer<typeof VisitSubmissionSchema>;
