"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { AuditTable } from "@/components/AuditTable";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";

export function HistoryModal({ otp, path, onClose }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api(path, { query: { page, pageSize: 20 } })
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [path, page]);

  return (
    <Modal title={`Histórico de “${otp.name}”`} onClose={onClose} size="xl">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !data ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : (
        <>
          <AuditTable items={data.items} showOtp={false} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      )}
    </Modal>
  );
}
