"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useAdminOms() {
  const [oms, setOms] = useState([]);
  useEffect(() => {
    api("/admin/oms").then(setOms).catch(() => setOms([]));
  }, []);
  return oms;
}

export function useQueryParams() {
  const [params, setParams] = useState(null);
  useEffect(() => {
    setParams(Object.fromEntries(new URLSearchParams(window.location.search)));
  }, []);
  return params;
}

export function OmSelect({ value, onChange, oms }) {
  return (
    <select className="input-field lg:w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Todas as OMs</option>
      {oms.map((om) => (
        <option key={om} value={om}>{om}</option>
      ))}
    </select>
  );
}
