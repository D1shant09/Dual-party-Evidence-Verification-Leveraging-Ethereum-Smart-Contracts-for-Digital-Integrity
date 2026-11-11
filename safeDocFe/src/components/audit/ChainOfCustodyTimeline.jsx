import { useState } from "react";

export default function ChainOfCustodyTimeline({ timeline = [] }) {
  const [copiedKey, setCopiedKey] = useState("");

  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
        No audit events recorded for this evidence container yet.
      </div>
    );
  }

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "N/A";
    const d = new Date(isoStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 transition-colors">
      {timeline.map((event, idx) => {
        const isLast = idx === timeline.length - 1;
        const shortActor =
          event.actor && event.actor.startsWith("0x")
            ? `${event.actor.slice(0, 6)}...${event.actor.slice(-4)}`
            : event.actor;

        const shortTx =
          event.txHash && event.txHash.startsWith("0x")
            ? `${event.txHash.slice(0, 10)}...${event.txHash.slice(-6)}`
            : event.txHash;

        return (
          <div key={`timeline-${idx}-${event.timestamp}`} className="relative group">
            {/* Circle Node on Timeline */}
            <div
              className={`absolute -left-[1.85rem] top-1.5 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                isLast
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-xs ring-4 ring-indigo-50 dark:ring-indigo-950/60"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs"
              }`}
            >
              {idx + 1}
            </div>

            {/* Event Content Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors text-left space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{event.title}</h4>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      event.badgeColor || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {event.badge}
                  </span>
                </div>
                <time className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {formatDate(event.timestamp)}
                </time>
              </div>

              {/* Event Description */}
              <p className="text-xs text-slate-700 dark:text-slate-300">{event.description}</p>

              {/* Details & Provenance Grid */}
              <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700/80">
                <div className="flex items-center gap-1">
                  <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Actor:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(event.actor, `actor-${idx}`)}
                    title="Click to copy actor address"
                    className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-bold text-slate-800 dark:text-slate-200"
                  >
                    {copiedKey === `actor-${idx}` ? <span className="text-emerald-600 font-sans">Copied!</span> : shortActor}
                  </button>
                  {event.role && <span className="text-slate-400 font-sans">({event.role})</span>}
                </div>

                {event.blockNumber && (
                  <div>
                    <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Block:</span>{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">#{event.blockNumber}</span>
                  </div>
                )}

                {event.txHash && (
                  <div className="flex items-center gap-1">
                    <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Tx:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(event.txHash, `tx-${idx}`)}
                      title="Click to copy transaction hash"
                      className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer text-slate-800 dark:text-slate-200"
                    >
                      {copiedKey === `tx-${idx}` ? <span className="text-emerald-600 font-sans">Copied!</span> : shortTx}
                    </button>
                  </div>
                )}

                {event.cid && (
                  <div className="w-full break-all flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="truncate">
                      <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">CID: </span>
                      <span className="text-indigo-600 dark:text-indigo-400">{event.cid}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(event.cid, `cid-${idx}`)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer text-[10px] font-sans shrink-0"
                    >
                      {copiedKey === `cid-${idx}` ? <span className="text-emerald-600 font-medium">Copied!</span> : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
