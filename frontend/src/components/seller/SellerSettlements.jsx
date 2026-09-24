import { useState, useEffect } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function SellerSettlements({ accountStatus }) {
  const [earnings, setEarnings] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettlementData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [earnRes, settRes] = await Promise.all([
        api.get("/settlements/seller/earnings"),
        api.get("/settlements/seller/my"),
      ]);

      if (earnRes && earnRes.summary) {
        setEarnings(earnRes.summary);
      }

      if (settRes && Array.isArray(settRes.settlements)) {
        setSettlements(settRes.settlements);
      } else if (earnRes && Array.isArray(earnRes.settlements)) {
        setSettlements(earnRes.settlements);
      } else {
        setSettlements([]);
      }
    } catch (err) {
      console.error("Failed to load seller settlements:", err);
      setError(formatApiError(err, "Failed to load settlement information."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlementData();
  }, []);

  const totalGross = earnings?.totalGross ?? 0;
  const totalCommission = earnings?.totalCommission ?? 0;
  const totalNet = earnings?.totalNet ?? 0;
  const pendingAmount = earnings?.pendingAmount ?? 0;
  const paidAmount = earnings?.paidAmount ?? 0;

  return (
    <div className="seller-settlements-page">
      <div className="seller-subpage-header">
        <div>
          <h2>Merchant Earnings & Settlements</h2>
          <p className="subpage-subtitle">
            Review your store revenue, platform commission deductions, and official payout records
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={fetchSettlementData}
          disabled={loading}
        >
          🔄 Refresh Settlements
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="settlements-summary-grid">
        <div className="summary-card">
          <span className="summary-card-label">Gross Sales</span>
          <div className="summary-card-val">
            {loading ? "..." : `$${totalGross.toFixed(2)}`}
          </div>
          <span className="summary-card-sub">Total delivered revenue</span>
        </div>

        <div className="summary-card">
          <span className="summary-card-label">Platform Fee (10%)</span>
          <div className="summary-card-val text-muted">
            {loading ? "..." : `-$${totalCommission.toFixed(2)}`}
          </div>
          <span className="summary-card-sub">Marketplace commission</span>
        </div>

        <div className="summary-card highlight">
          <span className="summary-card-label">Total Net Revenue</span>
          <div className="summary-card-val text-primary">
            {loading ? "..." : `$${totalNet.toFixed(2)}`}
          </div>
          <span className="summary-card-sub">After commission deductions</span>
        </div>

        <div className="summary-card">
          <span className="summary-card-label">Pending Payouts</span>
          <div className="summary-card-val text-warning">
            {loading ? "..." : `$${pendingAmount.toFixed(2)}`}
          </div>
          <span className="summary-card-sub">Awaiting admin remittance</span>
        </div>

        <div className="summary-card">
          <span className="summary-card-label">Paid to Merchant</span>
          <div className="summary-card-val text-success">
            {loading ? "..." : `$${paidAmount.toFixed(2)}`}
          </div>
          <span className="summary-card-sub">Processed and completed</span>
        </div>
      </div>

      {/* Settlement Records Table */}
      <div className="settlements-records-section">
        <div className="section-title-bar">
          <h3>Settlement Transactions ({settlements.length})</h3>
        </div>

        {loading ? (
          <div className="seller-loading-box">
            <div className="auth-spinner large"></div>
            <p>Loading settlement records...</p>
          </div>
        ) : settlements.length === 0 ? (
          <div className="empty-overview-box large">
            <span className="empty-icon-lg">💰</span>
            <h3>No Settlement Records Yet</h3>
            <p>
              Settlements are generated automatically or by administration once your packages are
              delivered to customers.
            </p>
          </div>
        ) : (
          <div className="seller-table-card">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Settlement ID</th>
                  <th>Order Reference</th>
                  <th>Gross Sales</th>
                  <th>Commission (10%)</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Payment Reference</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => {
                  const orderObj =
                    typeof settlement.orderId === "object" ? settlement.orderId : null;
                  const orderRef = orderObj?._id || settlement.orderId;

                  return (
                    <tr key={settlement._id}>
                      <td className="mono">#{settlement._id}</td>
                      <td className="mono">{orderRef ? `#${orderRef}` : "—"}</td>
                      <td>${Number(settlement.grossAmount || 0).toFixed(2)}</td>
                      <td className="text-muted">
                        -${Number(settlement.commissionAmount || 0).toFixed(2)}
                      </td>
                      <td>
                        <strong className="text-primary">
                          ${Number(settlement.netAmount || 0).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            settlement.status === "paid" ? "confirmed" : "pending"
                          }`}
                        >
                          {settlement.status || "pending"}
                        </span>
                      </td>
                      <td>
                        {new Date(settlement.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        {settlement.status === "paid" ? (
                          <span className="payment-ref-pill mono">
                            {settlement.paymentReference || "Direct Bank Transfer"}
                          </span>
                        ) : (
                          <span className="text-muted">Pending Transfer</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
