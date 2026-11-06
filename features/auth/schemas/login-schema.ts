import { z } from "zod";

/** Validates raw login form input before any database or crypto work. */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมลหรือเลขบัตรประชาชน")
    .transform((value) => (value.includes("@") ? value.toLowerCase() : value))
    .refine(
      (value) => z.string().email().safeParse(value).success || /^\d{13}$/.test(value),
      "กรุณากรอกอีเมลหรือเลขบัตรประชาชน 13 หลัก",
    ),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type LoginInput = z.infer<typeof loginSchema>;
