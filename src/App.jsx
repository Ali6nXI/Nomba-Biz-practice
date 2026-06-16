import { useEffect, useMemo, useState } from "react";
import "./App.css";

const starterInvoices = [
  {
    id: "INV-1001",
    customer: "Amaka Stores",
    phone: "08012345678",
    item: "Monthly inventory and sales tracker setup",
    amount: 35000,
    status: "paid",
    date: "2026-06-14",
    dueDate: "2026-06-20",
    nombaReference: "NOMBA-DEMO-INV1001",
    checkoutUrl: "",
    integrationStatus: "webhook_confirmed",
  },
  {
    id: "INV-1002",
    customer: "Dele Fashion Hub",
    phone: "08123456789",
    item: "Online order payment collection",
    amount: 52000,
    status: "unpaid",
    date: "2026-06-15",
    dueDate: "2026-06-22",
    nombaReference: "",
    checkoutUrl: "",
    integrationStatus: "not_started",
  },
  {
    id: "INV-1003",
    customer: "Blessing Hair Salon",
    phone: "07098765432",
    item: "Customer booking and deposit payment",
    amount: 28000,
    status: "unpaid",
    date: "2026-06-16",
    dueDate: "2026-06-25",
    nombaReference: "",
    checkoutUrl: "",
    integrationStatus: "not_started",
  },
];

const today = new Date().toISOString().slice(0, 10);

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function createInvoiceId() {
  return `INV-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createNombaReference(invoiceId) {
  return `NOMBA-DEMO-${invoiceId}-${Date.now().toString().slice(-6)}`;
}

function normalizePhone(phone) {
  const cleaned = String(phone || "").replace(/\D/g, "");

  if (cleaned.startsWith("234")) return cleaned;
  if (cleaned.startsWith("0")) return `234${cleaned.slice(1)}`;

  return cleaned;
}

function App() {
  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem("nombabiz-invoices");
    return saved ? JSON.parse(saved) : starterInvoices;
  });

  const [webhookLog, setWebhookLog] = useState(() => {
    const saved = localStorage.getItem("nombabiz-webhook-log");
    return saved ? JSON.parse(saved) : [];
  });

  const [filter, setFilter] = useState("all");
  const [selectedCheckout, setSelectedCheckout] = useState(null);

  const [form, setForm] = useState({
    customer: "",
    phone: "",
    item: "",
    amount: "",
    dueDate: "",
  });

  useEffect(() => {
    localStorage.setItem("nombabiz-invoices", JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem("nombabiz-webhook-log", JSON.stringify(webhookLog));
  }, [webhookLog]);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const paid = invoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const unpaid = total - paid;
    const checkoutCreated = invoices.filter((invoice) => invoice.checkoutUrl).length;

    return {
      count: invoices.length,
      total,
      paid,
      unpaid,
      checkoutCreated,
    };
  }, [invoices]);

  const visibleInvoices = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter((invoice) => invoice.status === filter);
  }, [filter, invoices]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.customer || !form.item || !form.amount) {
      alert("Please enter customer name, item/service, and amount.");
      return;
    }

    const newInvoice = {
      id: createInvoiceId(),
      customer: form.customer,
      phone: form.phone,
      item: form.item,
      amount: Number(form.amount),
      status: "unpaid",
      date: today,
      dueDate: form.dueDate || today,
      nombaReference: "",
      checkoutUrl: "",
      integrationStatus: "not_started",
    };

    setInvoices((currentInvoices) => [newInvoice, ...currentInvoices]);

    setForm({
      customer: "",
      phone: "",
      item: "",
      amount: "",
      dueDate: "",
    });
  }

  function toggleStatus(id) {
    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) =>
        invoice.id === id
          ? {
              ...invoice,
              status: invoice.status === "paid" ? "unpaid" : "paid",
            }
          : invoice
      )
    );
  }

  function deleteInvoice(id) {
    const confirmDelete = confirm("Delete this invoice?");
    if (!confirmDelete) return;

    setInvoices((currentInvoices) =>
      currentInvoices.filter((invoice) => invoice.id !== id)
    );
  }

  function generateDemoCheckout(id) {
    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) => {
        if (invoice.id !== id) return invoice;

        const reference = invoice.nombaReference || createNombaReference(invoice.id);

        const checkoutUrl = `${window.location.origin}/?checkout=${invoice.id}&reference=${reference}`;

        return {
          ...invoice,
          nombaReference: reference,
          checkoutUrl,
          integrationStatus: "checkout_created",
        };
      })
    );
  }

  function openCheckoutPreview(invoice) {
    if (!invoice.checkoutUrl) {
      alert("Generate a demo Nomba Checkout link first.");
      return;
    }

    setSelectedCheckout(invoice);
  }

  function simulateNombaWebhook(id) {
    const eventTime = new Date().toLocaleString();

    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) => {
        if (invoice.id !== id) return invoice;

        const reference = invoice.nombaReference || createNombaReference(invoice.id);
        const checkoutUrl =
          invoice.checkoutUrl ||
          `${window.location.origin}/?checkout=${invoice.id}&reference=${reference}`;

        return {
          ...invoice,
          status: "paid",
          nombaReference: reference,
          checkoutUrl,
          integrationStatus: "webhook_confirmed",
          lastWebhookEvent: {
            type: "payment.success",
            status: "verified",
            reference,
            time: eventTime,
          },
        };
      })
    );

    setWebhookLog((currentLog) => [
      {
        id: `evt-${Date.now()}`,
        invoiceId: id,
        type: "payment.success",
        status: "verified",
        time: eventTime,
      },
      ...currentLog,
    ]);
  }

  function getWhatsAppLink(invoice) {
    const phone = normalizePhone(invoice.phone);

    const paymentLine = invoice.checkoutUrl
      ? `Payment link: ${invoice.checkoutUrl}`
      : "Payment link: Nomba Checkout link will be generated by the merchant.";

    const message = `
Hello ${invoice.customer},

Your invoice ${invoice.id} is ready.

Service/Product: ${invoice.item}
Amount: ${formatNaira(invoice.amount)}
Due Date: ${invoice.dueDate}

${paymentLine}

Thank you.
NombaBiz
    `.trim();

    if (phone) {
      return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  function getIntegrationLabel(invoice) {
    if (invoice.integrationStatus === "webhook_confirmed") {
      return "Webhook confirmed";
    }

    if (invoice.integrationStatus === "checkout_created") {
      return "Checkout link created";
    }

    return "Nomba integration pending";
  }

  return (
    <div className="app">
      <header className="hero">
        <nav className="nav">
          <div className="logo">NombaBiz</div>
          <span className="badge">Build Track • Integrations & Plugins</span>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">Nomba x DevCareer Hackathon 2026</p>
          <h1>Invoice and payment tracker for Nigerian small businesses.</h1>
          <p className="hero-text">
            Create invoices, share payment requests through WhatsApp, track
            paid/unpaid customers, and connect payments to Nomba Checkout and
            Webhooks.
          </p>

          <div className="hero-actions">
            <a href="#new-invoice" className="primary-link">
              Create Invoice
            </a>
            <a href="#pitch" className="secondary-link">
              View Pitch
            </a>
          </div>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Invoices</span>
          <strong>{stats.count}</strong>
        </div>

        <div className="stat-card">
          <span>Total Value</span>
          <strong>{formatNaira(stats.total)}</strong>
        </div>

        <div className="stat-card success">
          <span>Paid</span>
          <strong>{formatNaira(stats.paid)}</strong>
        </div>

        <div className="stat-card warning">
          <span>Outstanding</span>
          <strong>{formatNaira(stats.unpaid)}</strong>
        </div>
      </section>

      <main className="layout">
        <section className="panel" id="new-invoice">
          <div className="section-heading">
            <p>Step 1</p>
            <h2>Create a new invoice</h2>
          </div>

          <form onSubmit={handleSubmit} className="invoice-form">
            <label>
              Customer / Business Name
              <input
                name="customer"
                value={form.customer}
                onChange={handleChange}
                placeholder="e.g. Chika Food Store"
              />
            </label>

            <label>
              Customer WhatsApp Number
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
              />
            </label>

            <label>
              Product or Service
              <input
                name="item"
                value={form.item}
                onChange={handleChange}
                placeholder="e.g. Weekly supply payment"
              />
            </label>

            <div className="form-row">
              <label>
                Amount
                <input
                  name="amount"
                  type="number"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000"
                />
              </label>

              <label>
                Due Date
                <input
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={handleChange}
                />
              </label>
            </div>

            <button type="submit">Add Invoice</button>
          </form>

          <div className="integration-note">
            <h3>Nomba integration plan</h3>
            <ul>
              <li>Generate Nomba Checkout payment links for each invoice.</li>
              <li>Receive webhook alerts when customers pay.</li>
              <li>Automatically mark invoices as paid after confirmation.</li>
              <li>Show payment history for each business owner.</li>
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="invoice-topbar">
            <div className="section-heading">
              <p>Step 2</p>
              <h2>Track customer payments</h2>
            </div>

            <div className="filters">
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                className={filter === "paid" ? "active" : ""}
                onClick={() => setFilter("paid")}
              >
                Paid
              </button>
              <button
                className={filter === "unpaid" ? "active" : ""}
                onClick={() => setFilter("unpaid")}
              >
                Unpaid
              </button>
            </div>
          </div>

          <div className="invoice-list">
            {visibleInvoices.length === 0 ? (
              <p className="empty">No invoices in this category yet.</p>
            ) : (
              visibleInvoices.map((invoice) => (
                <article className="invoice-card" key={invoice.id}>
                  <div className="invoice-main">
                    <div>
                      <p className="invoice-id">{invoice.id}</p>
                      <h3>{invoice.customer}</h3>
                      <p>{invoice.item}</p>
                    </div>

                    <span className={`status ${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </div>

                  <div className="invoice-meta">
                    <span>{formatNaira(invoice.amount)}</span>
                    <span>Due: {invoice.dueDate}</span>
                  </div>

                  <div className="nomba-box">
                    <p>
                      <strong>Nomba status:</strong> {getIntegrationLabel(invoice)}
                    </p>

                    {invoice.nombaReference ? (
                      <p>
                        <strong>Reference:</strong>{" "}
                        <code>{invoice.nombaReference}</code>
                      </p>
                    ) : (
                      <p>No payment reference generated yet.</p>
                    )}

                    {invoice.lastWebhookEvent ? (
                      <p>
                        <strong>Last webhook:</strong>{" "}
                        {invoice.lastWebhookEvent.type} •{" "}
                        {invoice.lastWebhookEvent.status}
                      </p>
                    ) : null}
                  </div>

                  <div className="invoice-actions">
                    <button
                      className="checkout-button"
                      onClick={() => generateDemoCheckout(invoice.id)}
                    >
                      Generate Demo Checkout
                    </button>

                    <button onClick={() => openCheckoutPreview(invoice)}>
                      Open Checkout Preview
                    </button>

                    <button
                      className="webhook-button"
                      onClick={() => simulateNombaWebhook(invoice.id)}
                    >
                      Simulate Webhook
                    </button>

                    <a
                      href={getWhatsAppLink(invoice)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Share on WhatsApp
                    </a>

                    <button onClick={() => toggleStatus(invoice.id)}>
                      Mark {invoice.status === "paid" ? "Unpaid" : "Paid"}
                    </button>

                    <button
                      className="danger"
                      onClick={() => deleteInvoice(invoice.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <section className="pitch" id="pitch">
        <p className="eyebrow">Hackathon pitch</p>
        <h2>Why NombaBiz matters</h2>

        <div className="pitch-grid">
          <div>
            <h3>Problem</h3>
            <p>
              Many Nigerian small businesses collect payments through transfers,
              cash, and chat messages. They often lose track of who has paid,
              who is owing, and which invoice belongs to which customer.
            </p>
          </div>

          <div>
            <h3>Solution</h3>
            <p>
              NombaBiz gives merchants a simple dashboard for invoices, payment
              reminders, WhatsApp sharing, and automatic payment confirmation
              through Nomba Checkout and Webhooks.
            </p>
          </div>

          <div>
            <h3>Impact</h3>
            <p>
              Small businesses can reduce payment confusion, improve cash flow,
              and manage customer payments without needing complex accounting
              software.
            </p>
          </div>
        </div>
      </section>

      <section className="pitch webhook-section">
        <p className="eyebrow">Webhook monitor</p>
        <h2>Recent simulated Nomba events</h2>

        {webhookLog.length === 0 ? (
          <p className="empty">No webhook event has been simulated yet.</p>
        ) : (
          <div className="webhook-list">
            {webhookLog.slice(0, 5).map((event) => (
              <div className="webhook-item" key={event.id}>
                <strong>{event.type}</strong>
                <span>{event.invoiceId}</span>
                <span>{event.status}</span>
                <small>{event.time}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        Built for Nomba x DevCareer Hackathon 2026 • MVP Version
      </footer>

      {selectedCheckout ? (
        <div className="modal-backdrop" onClick={() => setSelectedCheckout(null)}>
          <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Demo Nomba Checkout</p>
            <h2>{selectedCheckout.customer}</h2>
            <p>{selectedCheckout.item}</p>

            <div className="checkout-amount">
              {formatNaira(selectedCheckout.amount)}
            </div>

            <div className="checkout-details">
              <p>
                <strong>Invoice:</strong> {selectedCheckout.id}
              </p>
              <p>
                <strong>Reference:</strong> {selectedCheckout.nombaReference}
              </p>
              <p>
                <strong>Checkout URL:</strong> {selectedCheckout.checkoutUrl}
              </p>
            </div>

            <p className="demo-warning">
              This is a simulated checkout preview. In production, this button
              will redirect customers to a real Nomba Checkout page.
            </p>

            <div className="modal-actions">
              <button
                className="webhook-button"
                onClick={() => {
                  simulateNombaWebhook(selectedCheckout.id);
                  setSelectedCheckout(null);
                }}
              >
                Simulate Successful Payment
              </button>

              <button onClick={() => setSelectedCheckout(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;