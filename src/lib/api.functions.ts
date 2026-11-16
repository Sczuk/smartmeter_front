import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  ACCESS,
  REFRESH,
  api,
  clearTokens,
  publicAuth,
  storeTokens,
} from "./api.server";

import type {
  DailyPoint,
  DeviceType,
  Measurement,
  PowerPoint,
  SmartmeterDetail,
  SmartmeterList,
} from "./types";

// Schemas reutilizáveis
const idSchema = z.string().trim().min(1, "Identificador obrigatório");

const nameSchema = z.string().trim().min(1, "Nome obrigatório");

const emailSchema = z
  .string()
  .trim()
  .email("E-mail inválido");

const passwordSchema = z
  .string()
  .min(1, "Senha obrigatória");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }, "Data inválida");

const deviceTypeSchema = z.enum(["OUTLET", "SWITCH"]);

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  remember: z.boolean(),
});

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const smartmeterSchema = z.object({
  name: nameSchema,
  macAddress: z.string().trim().min(1, "MAC address obrigatório"),
});

const createDeviceSchema = z.object({
  smartmeterId: idSchema,
  name: nameSchema,
  type: deviceTypeSchema,
});

const deleteDeviceSchema = z.object({
  smartmeterId: idSchema,
  deviceId: idSchema,
});

const idInputSchema = z.object({
  id: idSchema,
});

const powerSchema = z.object({
  id: idSchema,
  hours: z.number().int().positive(),
});

const dailySchema = z.object({
  id: idSchema,
  from: dateSchema,
  to: dateSchema,
  deviceId: idSchema.optional(),
}).refine(
  (data) => data.from <= data.to,
  {
    message: "A data inicial não pode ser posterior à data final",
    path: ["from"],
  },
);

const commandSchema = z.object({
  deviceId: idSchema,
  on: z.boolean(),
});

const enc = encodeURIComponent;

// Sessão
export const hasSession = createServerFn({ method: "GET" }).handler(async () => {
  return {
    authed: Boolean(getCookie(ACCESS) || getCookie(REFRESH)),
  };
});

// Login
export const login = createServerFn({ method: "POST" })
  .inputValidator((data) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const r = await publicAuth("/api/auth/login", {
      email: data.email,
      password: data.password,
    });

    if (
      r.status >= 200 &&
      r.status < 300 &&
      storeTokens(r.json, data.remember)
    ) {
      return { ok: true as const };
    }

    return { ok: false as const, status: r.status };
  });

// Cadastro
export const register = createServerFn({ method: "POST" })
  .inputValidator((data) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const r = await publicAuth("/api/auth/register", {
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (
      r.status >= 200 &&
      r.status < 300 &&
      storeTokens(r.json, true)
    ) {
      return { ok: true as const };
    }

    return { ok: false as const, status: r.status };
  });

// Logout
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const rt = getCookie(REFRESH);

  if (rt) {
    await publicAuth("/api/auth/logout", {
      refresh_token: rt,
    }).catch(() => undefined);
  }

  clearTokens();

  return { ok: true };
});

// Smartmeters
export const listSmartmeters = createServerFn({ method: "GET" }).handler(() =>
  api<SmartmeterList>("register", "GET", "/api/smartmeter/smartmeters"),
);

export const getSmartmeter = createServerFn({ method: "GET" })
  .inputValidator((data) => idInputSchema.parse(data))
  .handler(({ data }) =>
    api<SmartmeterDetail>(
      "register",
      "GET",
      `/api/smartmeter/findSmartmeter/smartmeterId/${enc(data.id)}`,
    ),
  );

export const createSmartmeter = createServerFn({ method: "POST" })
  .inputValidator((data) => smartmeterSchema.parse(data))
  .handler(({ data }) =>
    api(
      "register",
      "POST",
      "/api/smartmeter/create",
      {
        name: data.name,
        macAddress: data.macAddress.toUpperCase(),
      },
    ),
  );

export const deleteSmartmeter = createServerFn({ method: "POST" })
  .inputValidator((data) => idInputSchema.parse(data))
  .handler(async ({ data }) => {
    await api(
      "register",
      "DELETE",
      `/api/smartmeter/deleteSmartmeter/smartmeterId/${enc(data.id)}`,
    );

    return { ok: true };
  });

// Dispositivos
export const createDevice = createServerFn({ method: "POST" })
  .inputValidator((data) => createDeviceSchema.parse(data))
  .handler(({ data }) =>
    api(
      "register",
      "POST",
      `/api/device/smartmeterId/${enc(data.smartmeterId)}/create`,
      {
        name: data.name,
        type: data.type as DeviceType,
      },
    ),
  );

export const deleteDevice = createServerFn({ method: "POST" })
  .inputValidator((data) => deleteDeviceSchema.parse(data))
  .handler(async ({ data }) => {
    await api(
      "register",
      "DELETE",
      `/api/device/delete/deviceId/${enc(data.deviceId)}/smartmeterId/${enc(data.smartmeterId)}`,
    );

    return { ok: true };
  });

// Medições
export const getLatest = createServerFn({ method: "GET" })
  .inputValidator((data) => idInputSchema.parse(data))
  .handler(async ({ data }) => {
    const r = await api<{ measurements: Measurement[] }>(
      "energy",
      "GET",
      `/measurements/smartmeter/${enc(data.id)}/devices/latest`,
    );

    return r?.measurements ?? [];
  });

export const getPower = createServerFn({ method: "GET" })
  .inputValidator((data) => powerSchema.parse(data))
  .handler(async ({ data }) => {
    const query = new URLSearchParams({
      hours: String(data.hours),
    });

    return (
      (await api<PowerPoint[]>(
        "energy",
        "GET",
        `/measurements/smartmeter/${enc(data.id)}/power?${query}`,
      )) ?? []
    );
  });

export const getDaily = createServerFn({ method: "GET" })
  .inputValidator((data) => dailySchema.parse(data))
  .handler(async ({ data }) => {
    const query = new URLSearchParams({
      from: data.from,
      to: data.to,
    });

    if (data.deviceId) {
      query.set("deviceId", data.deviceId);
    }

    const r =
      (await api<DailyPoint[]>(
        "energy",
        "GET",
        `/measurements/smartmeter/${enc(data.id)}/consumption/daily?${query}`,
      )) ?? [];

    return r.map((point) => ({
      date: point.date.slice(0, 10).replace(/\//g, "-"),
      kwh: point.kwh,
    }));
  });

// Comandos
export const sendCommand = createServerFn({ method: "POST" })
  .inputValidator((data) => commandSchema.parse(data))
  .handler(async ({ data }) => {
    await api(
      "energy",
      "POST",
      `/devices/control/${data.on ? "turnOn" : "turnOff"}/${enc(data.deviceId)}`,
    );

    return { sent: true };
  });
