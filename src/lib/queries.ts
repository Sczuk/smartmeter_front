import { queryOptions } from "@tanstack/react-query";
import { getDaily, getLatest, getPower, getSmartmeter, listSmartmeters } from "./api.functions";

export const smartmetersQuery = () =>
  queryOptions({ queryKey: ["smartmeters"], queryFn: () => listSmartmeters() });

export const smartmeterQuery = (id: string) =>
  queryOptions({ queryKey: ["smartmeter", id], queryFn: () => getSmartmeter({ data: { id } }), enabled: !!id });

export const latestQuery = (id: string, fast = false) =>
  queryOptions({
    queryKey: ["latest", id],
    queryFn: () => getLatest({ data: { id } }),
    enabled: !!id,
    refetchInterval: fast ? 2000 : 15000,
  });

export const powerQuery = (id: string) =>
  queryOptions({ queryKey: ["power", id], queryFn: () => getPower({ data: { id, hours: 48 } }), enabled: !!id, refetchInterval: 60000 });

export const dailyQuery = (id: string, from: string, to: string, deviceId?: string) =>
  queryOptions({
    queryKey: ["daily", id, from, to, deviceId ?? ""],
    queryFn: () => getDaily({ data: { id, from, to, deviceId } }),
    enabled: !!id,
  });
