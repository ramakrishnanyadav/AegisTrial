import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env file into process.env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const envSchema = z.object({
  PORT: z.string().default('3001').transform((val: string) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AUTH_MODE: z.enum(['development', 'production']).default('production'),
  LYZR_API_KEY: z.string().optional().default(''),
  LYZR_USER_ID: z.string().default('aegistrial-system'),
  LYZR_CRITERIA_AGENT_ID: z.string().optional().default(''),
  LYZR_EVIDENCE_AGENT_ID: z.string().optional().default(''),
  LYZR_SAFETY_AGENT_ID: z.string().optional().default(''),
  LYZR_ONTOLOGY_AGENT_ID: z.string().optional().default(''),
  LYZR_DOSSIER_AGENT_ID: z.string().optional().default(''),
  ENABLE_AUDIT_DOSSIER_AGENT: z
    .string()
    .default('false')
    .transform((val: string) => val === 'true'),
  ENABLE_DEMO_FIXTURES: z
    .string()
    .default('true')
    .transform((val: string) => val === 'true'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production' && data.AUTH_MODE === 'development') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Fatal: AUTH_MODE cannot be set to 'development' when NODE_ENV is 'production'.",
      path: ['AUTH_MODE'],
    });
  }
});

let parsedConfig: z.infer<typeof envSchema>;

try {
  parsedConfig = envSchema.parse(process.env);
} catch (err: any) {
  if (err && typeof err === 'object' && 'issues' in err && Array.isArray(err.issues)) {
    const formatted = (err.issues as z.ZodIssue[])
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ [Config Error] Invalid environment configuration:\n${formatted}\n`);
    process.exit(1);
  }
  throw err;
}

export const config = parsedConfig;
