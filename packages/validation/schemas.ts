import { z } from 'zod';

export const PrintSettingsSchema = z.object({
  copies: z.number().int().min(1).max(100).default(1),
  color: z.boolean().default(false),
  doubleSided: z.boolean().default(false),
});

export type PrintSettings = z.infer<typeof PrintSettingsSchema>;
