export default function ChainOfCustodyTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
        No audit events recorded for this evidence container yet.
      </div>
    );
  }

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
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
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
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
              className={`absolute -left-[1.85rem] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                isLast
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm ring-4 ring-indigo-50"
                  : "bg-white border-indigo-400 text-indigo-700 shadow-xs"
              }`}
            >
              {idx + 1}
            </div>

            {/* Event Content Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs hover:border-indigo-300 transition-colors text-left space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">{event.title}</h4>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      event.badgeColor || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {event.badge}
                  </span>
                </div>
                <time className="text-[11px] font-mono text-gray-500">
                  {formatDate(event.timestamp)}
                </time>
              </div>

              {/* Event Description */}
              <p className="text-xs text-gray-700">{event.description}</p>

              {/* Details & Provenance Grid */}
              <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-gray-600 bg-gray-50/80 rounded p-2 border border-gray-100">
                <div>
                  <span className="font-sans font-semibold text-gray-500">Actor:</span>{" "}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(event.actor)}
                    title="Click to copy actor address"
                    className="hover:underline hover:text-indigo-600 cursor-pointer font-bold"
                  >
                    {shortActor}
                  </button>
                  {event.role && <span className="ml-1 text-gray-400 font-sans">({event.role})</span>}
                </div>

                {event.blockNumber && (
                  <div>
                    <span className="font-sans font-semibold text-gray-500">Block:</span>{" "}
                    <span className="font-bold">#{event.blockNumber}</span>
                  </div>
                )}

                {event.txHash && (
                  <div>
                    <span className="font-sans font-semibold text-gray-500">Tx:</span>{" "}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(event.txHash)}
                      title="Click to copy transaction hash"
                      className="hover:underline hover:text-indigo-600 cursor-pointer"
                    >
                      {shortTx}
                    </button>
                  </div>
                )}

                {event.cid && (
                  <div className="w-full break-all">
                    <span className="font-sans font-semibold text-gray-500">CID:</span>{" "}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(event.cid)}
                      title="Click to copy IPFS CID"
                      className="hover:underline hover:text-indigo-600 cursor-pointer text-indigo-700"
                    >
                      {event.cid}
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
