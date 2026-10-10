import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState, ErrorState, PageLoader } from "../components/States";
import { Seo } from "../components/Seo";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../lib/api";
import {
  formatDate,
  formatMoney,
  nairaToKoboString,
  titleFromSlug,
} from "../lib/format";
import { uploadPrivateDocument, uploadPublicImage } from "../lib/uploads";
import type {
  ActivityRow,
  Category,
  DashboardData,
  Metric,
  PageResult,
  Product,
} from "../lib/types";

type WorkspaceKind = "seller" | "supplier" | "admin";

const kindLabel = {
  seller: "Seller centre",
  supplier: "Supplier portal",
  admin: "Control room",
};

function downloadCsv(filename: string, rows: object[]) {
  if (!rows.length) return;
  const keys = Array.from(
    new Set(
      rows.flatMap((row) =>
        Object.entries(row)
          .filter(([, value]) =>
            ["string", "number", "boolean"].includes(typeof value),
          )
          .map(([key]) => key),
      ),
    ),
  );
  const escape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    keys.map(escape).join(","),
    ...rows.map((row) =>
      keys
        .map((key) => escape((row as Record<string, unknown>)[key]))
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function workspaceItemPath(
  kind: "seller" | "supplier",
  section: string,
  id: string,
) {
  if (section === "messages") return `/messages/${id}`;
  if (kind === "seller" && section === "products")
    return `/seller/products/${id}/edit`;
  if (kind === "seller" && section === "orders")
    return `/seller/orders/${id}`;
  if (kind === "supplier" && section === "catalog")
    return `/supplier/catalog/${id}/edit`;
  if (kind === "supplier" && ["requests", "orders"].includes(section))
    return `/supplier/${section}/${id}`;
  return null;
}

const sellerOrderTransitions: Record<string, string[]> = {
  PAID: ["PROCESSING"],
  PROCESSING: ["READY"],
  READY: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

const supplierOrderTransitions: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY", "CANCELLED"],
  READY: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
};

export function DashboardPage({ kind }: { kind: WorkspaceKind }) {
  const endpoint = kind === "admin" ? "/admin/dashboard" : `/${kind}/dashboard`;
  const dashboard = useQuery({
    queryKey: [kind, "dashboard"],
    queryFn: () => api.get<DashboardData>(endpoint),
    staleTime: 30_000,
  });
  const title =
    kind === "admin"
      ? "Platform overview"
      : kind === "supplier"
        ? "Supply overview"
        : "Store overview";

  return (
    <>
      <Seo title={`${title} · ${kindLabel[kind]}`} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">{kindLabel[kind]}</span>
            <h2>{title}</h2>
            <p>
              {kind === "admin"
                ? "Monitor marketplace health, risk and operations."
                : "A focused view of today’s activity and what needs attention."}
            </p>
          </div>
          <div>
            {kind === "seller" && (
              <Link
                className="button button--primary"
                to="/seller/products/new"
              >
                <Plus /> Add product
              </Link>
            )}
            {kind === "supplier" && (
              <Link className="button button--primary" to="/supplier/requests">
                View requests <ArrowRight />
              </Link>
            )}
            {kind === "admin" && (
              <Link
                className="button button--secondary"
                to="/buysell-super-admin/audit-logs"
              >
                <FileText /> Audit log
              </Link>
            )}
          </div>
        </header>
        {dashboard.isLoading ? (
          <PageLoader label="Preparing dashboard" />
        ) : dashboard.isError ? (
          <ErrorState
            title="Dashboard unavailable"
            message={dashboard.error.message}
            onRetry={() => void dashboard.refetch()}
          />
        ) : (
          dashboard.data && (
            <>
              <MetricGrid metrics={dashboard.data.metrics} />
              {dashboard.data.chart?.length ? (
                <div className="dashboard-grid">
                  <ChartCard
                    values={dashboard.data.chart}
                    title={
                      kind === "admin"
                        ? "Marketplace volume"
                        : "Sales performance"
                    }
                  />
                  <article className="surface-card action-card">
                    <h3>Operational focus</h3>
                    <p>
                      Use the navigation to review records that need attention.
                      Every available action is permission checked by the
                      BUYSELL API.
                    </p>
                    <Link
                      className="button button--secondary button--full"
                      to={
                        kind === "admin"
                          ? "/buysell-super-admin/orders"
                          : kind === "supplier"
                            ? "/supplier/requests"
                            : "/seller/orders"
                      }
                    >
                      Open work queue <ArrowRight />
                    </Link>
                  </article>
                </div>
              ) : null}
              <RecentActivity
                rows={dashboard.data.rows}
                title={
                  kind === "admin"
                    ? "Latest platform activity"
                    : "Recent orders"
                }
              />
            </>
          )
        )}
      </div>
    </>
  );
}

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const icons = [CircleDollarSign, ShoppingBag, BarChart3, WalletCards];
  return (
    <section className="metric-grid" aria-label="Key metrics">
      {metrics.map((metric, index) => {
        const MetricIcon = icons[index % icons.length]!;
        return (
          <article key={metric.label}>
            <div>
              <span>
                <MetricIcon />
              </span>
              <small>{metric.label}</small>
            </div>
            <strong>{metric.value}</strong>
            {metric.change && (
              <p className={`metric-change metric-change--${metric.trend}`}>
                {metric.trend === "up" ? (
                  <TrendingUp />
                ) : metric.trend === "down" ? (
                  <TrendingDown />
                ) : null}
                {metric.change}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ChartCard({ values, title }: { values: number[]; title: string }) {
  const max = Math.max(...values, 1);
  return (
    <article className="surface-card chart-card">
      <div>
        <div>
          <small>Last 12 weeks</small>
          <h3>{title}</h3>
        </div>
        <select aria-label="Chart period">
          <option>12 weeks</option>
          <option>30 days</option>
        </select>
      </div>
      <div className="bar-chart" aria-label={`${title} bar chart`}>
        {values.map((value, index) => (
          <span
            key={index}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
            title={`${value}`}
          />
        ))}
      </div>
      <div className="chart-labels">
        <span>May</span>
        <span>June</span>
        <span>July</span>
        <span>August</span>
      </div>
    </article>
  );
}

function RecentActivity({
  rows,
  title,
}: {
  rows: ActivityRow[];
  title: string;
}) {
  return (
    <section className="surface-card data-section">
      <div className="data-section__head">
        <div>
          <h3>{title}</h3>
          <p>Live operational records from BUYSELL.</p>
        </div>
      </div>
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Status</th>
              <th>Value</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.primary}</strong>
                  <small>{row.secondary}</small>
                </td>
                <td>
                  <span
                    className={`status status--${row.status.toLowerCase().replaceAll(" ", "-")}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td>
                  <strong>{row.value ?? "—"}</strong>
                </td>
                <td>{row.date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface WorkspaceConfig {
  title: string;
  intro: string;
  singular: string;
  endpoint: string;
  createPath?: string;
  columns: string[];
  empty: string;
}

const pageConfig: Record<string, WorkspaceConfig> = {
  products: {
    title: "Products",
    intro: "Create clear listings and keep every offer accurate.",
    singular: "product",
    endpoint: "/seller/products",
    createPath: "/seller/products/new",
    columns: ["Product", "Stock", "Status", "Price"],
    empty: "Publish your first product to start building your storefront.",
  },
  inventory: {
    title: "Inventory",
    intro: "Track available, reserved and low-stock units.",
    singular: "inventory item",
    endpoint: "/seller/inventory",
    columns: ["Product", "Available", "Reserved", "Status"],
    empty: "Inventory appears after a product has a sellable variant.",
  },
  orders: {
    title: "Orders",
    intro: "Process paid orders and keep fulfilment moving.",
    singular: "order",
    endpoint: "/seller/orders",
    columns: ["Order", "Customer", "Status", "Total"],
    empty: "Paid customer orders will appear here.",
  },
  customers: {
    title: "Customers",
    intro: "Understand customers through completed marketplace activity.",
    singular: "customer",
    endpoint: "/seller/customers",
    columns: ["Customer", "Orders", "Last order", "Value"],
    empty: "Customer records appear after eligible orders.",
  },
  messages: {
    title: "Messages",
    intro: "Keep buyer conversations organised and on-platform.",
    singular: "conversation",
    endpoint: "/seller/messages",
    columns: ["Conversation", "Order", "Status", "Updated"],
    empty: "New buyer conversations will appear here.",
  },
  analytics: {
    title: "Analytics",
    intro: "Understand product, order and store performance.",
    singular: "report",
    endpoint: "/seller/analytics",
    columns: ["Metric", "Current", "Previous", "Change"],
    empty: "Analytics populate as your store receives traffic and orders.",
  },
  finance: {
    title: "Finance",
    intro: "Review sales, commissions, adjustments and available funds.",
    singular: "transaction",
    endpoint: "/seller/finance",
    columns: ["Transaction", "Type", "Status", "Amount"],
    empty: "Financial transactions will appear after payment activity.",
  },
  payouts: {
    title: "Payouts",
    intro: "Request eligible funds and track payout status.",
    singular: "payout",
    endpoint: "/seller/payouts",
    columns: ["Payout", "Destination", "Status", "Amount"],
    empty: "Payout requests will appear here.",
  },
  advertising: {
    title: "Advertising",
    intro: "Promote eligible products with controlled campaigns.",
    singular: "campaign",
    endpoint: "/seller/advertising",
    createPath: "/seller/advertising/new",
    columns: ["Campaign", "Period", "Status", "Spend"],
    empty: "Create a campaign when you are ready to grow product visibility.",
  },
  referrals: {
    title: "Referrals",
    intro: "Track eligible referrals and rewards.",
    singular: "referral",
    endpoint: "/seller/referrals",
    columns: ["Referral", "Joined", "Status", "Reward"],
    empty: "Your referred businesses will appear here.",
  },
  team: {
    title: "Team",
    intro: "Give teammates only the permissions they need.",
    singular: "team member",
    endpoint: "/seller/team",
    columns: ["Member", "Role", "Status", "Last active"],
    empty: "Invite a teammate to collaborate on this store.",
  },
  verification: {
    title: "Verification",
    intro: "Keep business verification information current.",
    singular: "submission",
    endpoint: "/seller/verification",
    columns: ["Check", "Submitted", "Status", "Updated"],
    empty: "Required verification steps will appear here.",
  },
  sourcing: {
    title: "Product sourcing",
    intro: "Request products, review quotes and track fulfilment.",
    singular: "sourcing request",
    endpoint: "/sourcing/requests",
    createPath: "/seller/sourcing/new",
    columns: ["Request", "Quantity", "Status", "Quote"],
    empty: "Start a sourcing request for a product your business needs.",
  },
  settings: {
    title: "Store settings",
    intro: "Manage storefront, fulfilment and notification preferences.",
    singular: "setting",
    endpoint: "/seller/settings",
    columns: ["Setting", "Value", "Status", "Updated"],
    empty: "Store preferences will appear here.",
  },
  "supplier-profile": {
    title: "Supplier profile",
    intro: "Present an accurate, verifiable supply capability.",
    singular: "profile item",
    endpoint: "/supplier/profile",
    columns: ["Field", "Value", "Status", "Updated"],
    empty: "Complete your supplier profile to receive qualified requests.",
  },
  "supplier-catalog": {
    title: "Wholesale catalog",
    intro:
      "Publish seller-only supply listings with auditable stock and volume pricing.",
    singular: "listing",
    endpoint: "/supplier/catalog",
    createPath: "/supplier/catalog/new",
    columns: ["Listing", "SKU", "Status", "Unit price"],
    empty: "Create your first wholesale listing for approved sellers.",
  },
  catalog: {
    title: "Supply catalog",
    intro: "Describe the products and capacity your business can supply.",
    singular: "catalog item",
    endpoint: "/supplier/catalog",
    columns: ["Item", "Minimum quantity", "Status", "Lead time"],
    empty: "Add a catalog item to show buyers what you can supply.",
  },
  requests: {
    title: "Open requests",
    intro: "Review eligible business demand and prepare clear quotes.",
    singular: "request",
    endpoint: "/supplier/requests",
    columns: ["Request", "Quantity", "Status", "Deadline"],
    empty: "Matching quotation requests will appear here.",
  },
  "supplier-orders": {
    title: "Supply orders",
    intro: "Track approved supplier commitments and fulfilment.",
    singular: "supply order",
    endpoint: "/supplier/orders",
    columns: ["Order", "Buyer", "Status", "Value"],
    empty: "Approved supply orders will appear here.",
  },
  "supplier-verification": {
    title: "Supplier verification",
    intro: "Complete the checks needed for qualified supply opportunities.",
    singular: "submission",
    endpoint: "/supplier/verification",
    columns: ["Check", "Submitted", "Status", "Updated"],
    empty: "Verification requirements will appear here.",
  },
};

export function WorkspaceListPage({
  kind,
  section,
}: {
  kind: "seller" | "supplier";
  section: string;
}) {
  const configKey =
    kind === "supplier" && section === "profile"
      ? "supplier-profile"
      : kind === "supplier" && section === "catalog"
        ? "supplier-catalog"
      : kind === "supplier" && section === "orders"
        ? "supplier-orders"
        : kind === "supplier" && section === "verification"
          ? "supplier-verification"
          : section;
  const config = pageConfig[configKey] ?? {
    title: titleFromSlug(section),
    intro: `Manage ${titleFromSlug(section).toLowerCase()} for your ${kind} account.`,
    singular: "record",
    endpoint: `/${kind}/${section}`,
    columns: ["Record", "Details", "Status", "Updated"],
    empty: "Records will appear here when they are available.",
  };
  const [search, setSearch] = useState("");
  const records = useQuery({
    queryKey: [kind, section, search],
    queryFn: () =>
      api.get<PageResult<ActivityRow | Record<string, any>>>(
        `${config.endpoint}?q=${encodeURIComponent(search)}`,
      ),
  });
  const items = records.data?.items ?? [];

  return (
    <>
      <Seo title={`${config.title} · ${kindLabel[kind]}`} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">{kindLabel[kind]}</span>
            <h2>{config.title}</h2>
            <p>{config.intro}</p>
          </div>
          {config.createPath && (
            <Link className="button button--primary" to={config.createPath}>
              <Plus /> New {config.singular}
            </Link>
          )}
        </header>
        <section className="surface-card data-section">
          <div className="data-toolbar">
            <label>
              <Search />
              <span className="sr-only">Search {config.title}</span>
              <input
                placeholder={`Search ${config.title.toLowerCase()}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              className="button button--secondary"
              disabled={!items.length}
              onClick={() =>
                downloadCsv(
                  `buysell-${kind}-${section}.csv`,
                  items,
                )
              }
            >
              <Download /> Export CSV
            </button>
          </div>
          {records.isLoading ? (
            <PageLoader />
          ) : records.isError ? (
            <ErrorState
              title={`${config.title} unavailable`}
              message={records.error.message}
              onRetry={() => void records.refetch()}
            />
          ) : !items.length ? (
            <EmptyState
              title={`No ${config.title.toLowerCase()} yet`}
              message={config.empty}
              action={
                config.createPath ? (
                  <Link
                    className="button button--primary"
                    to={config.createPath}
                  >
                    <Plus /> New {config.singular}
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <WorkspaceRow
                      item={item}
                      key={String(item.id ?? index)}
                      href={workspaceItemPath(
                        kind,
                        section,
                        String(item.id),
                      )}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function WorkspaceRow({
  item,
  href,
}: {
  item: ActivityRow | Record<string, any>;
  href?: string | null;
}) {
  const primary = String(
    item.primary ?? item.name ?? item.orderNumber ?? item.title ?? item.id,
  );
  const secondary = String(
    item.secondary ?? item.email ?? item.sku ?? item.quantity ?? "—",
  );
  const status = String(item.status ?? "Active");
  const value = String(item.value ?? item.total ?? item.price ?? "—");
  return (
    <tr>
      <td>
        <strong>{primary}</strong>
        <small>{secondary}</small>
      </td>
      <td>
        {String(
          item.quantity ?? item.type ?? item.customer ?? item.role ?? "—",
        )}
      </td>
      <td>
        <span
          className={`status status--${status.toLowerCase().replaceAll(" ", "-")}`}
        >
          {titleFromSlug(status)}
        </span>
      </td>
      <td>
        <strong>{value}</strong>
      </td>
      <td>
        {href ? (
          <Link
            className="icon-button icon-button--small"
            to={href}
            aria-label={`View ${primary}`}
          >
            <ChevronRight />
          </Link>
        ) : (
          <span aria-hidden="true">—</span>
        )}
      </td>
    </tr>
  );
}

export function SellerOnboardingPage() {
  const navigate = useNavigate();
  const { requestCapability } = useAuth();
  const { notify } = useToast();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Record<string, FormDataEntryValue>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [cacFile, setCacFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  const save = useMutation({
    mutationFn: async (body: Record<string, FormDataEntryValue>) => {
      if (!cacFile || !identityFile || !addressFile) {
        throw new Error("Upload all three required verification documents.");
      }
      const [cacAsset, identityAsset, addressAsset] = await Promise.all([
        uploadPrivateDocument(cacFile),
        uploadPrivateDocument(identityFile),
        uploadPrivateDocument(addressFile),
      ]);
      const payload = {
        legalName: String(body.legalName || ""),
        businessType: String(body.businessType || ""),
        cacRegistrationNumber: String(body.cacRegistrationNumber || ""),
        ownerFullName: String(body.ownerFullName || ""),
        phone: String(body.phone || ""),
        state: String(body.state || ""),
        registeredAddress: String(body.registeredAddress || ""),
        dispatchAddress: String(body.dispatchAddress || ""),
        handlingTime: String(body.handlingTime || ""),
      };
      await requestCapability("SELLER", payload);
      const store = await api.post<{ id: string }>("/seller/onboarding/store", {
        name: String(body.storeName || ""),
        description: String(body.description || ""),
        supportEmail: String(body.supportEmail || ""),
        supportPhone: String(body.phone || ""),
        location: String(body.state || ""),
      });
      await api.post("/kyc", {
        subjectType: "STORE",
        subjectId: store.id,
        documents: [
          { documentType: "CAC_CERTIFICATE", mediaAssetId: cacAsset.id },
          { documentType: "GOVERNMENT_ID", mediaAssetId: identityAsset.id },
          { documentType: "PROOF_OF_ADDRESS", mediaAssetId: addressAsset.id },
        ],
      });
      if (logoFile) {
        const asset = await uploadPublicImage(logoFile, "store");
        await api.patch(`/seller/${store.id}`, { logoAssetId: asset.id });
      }
    },
    onSuccess: () => {
      notify("Your store and verification documents have been submitted for review.");
      navigate("/account");
    },
    onError: (error) => notify(error.message, "error"),
  });
  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(new FormData(event.currentTarget)),
    }));
    setStep((value) => Math.min(4, value + 1));
  };
  const finish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({
      ...values,
      ...Object.fromEntries(new FormData(event.currentTarget)),
    });
  };
  return (
    <>
      <Seo title="Seller onboarding" noIndex />
      <div className="workspace-page onboarding-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Seller onboarding</span>
            <h2>Set up a store people can trust.</h2>
            <p>
              You can save progress and return before submitting for review.
            </p>
          </div>
        </header>
        <ol className="stepper">
          {["Business", "Verification", "Storefront", "Fulfilment"].map((label, index) => (
            <li className={step >= index + 1 ? "is-active" : ""} key={label}>
              <span>{step > index + 1 ? <Check /> : index + 1}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
        {step === 1 && (
          <form className="surface-card settings-form" onSubmit={next}>
            <h3>Tell us about the business</h3>
            <div className="form-grid">
              <label>
                <span>Registered business name</span>
                <input name="legalName" required />
              </label>
              <label>
                <span>Business type</span>
                <select name="businessType" required>
                  <option value="">Choose one</option>
                  <option>Individual</option>
                  <option>Registered business</option>
                  <option>Limited company</option>
                </select>
              </label>
              <label>
                <span>CAC registration number</span>
                <input name="cacRegistrationNumber" autoComplete="off" required />
              </label>
              <label>
                <span>Director or owner full name</span>
                <input name="ownerFullName" autoComplete="name" required />
              </label>
              <label>
                <span>Phone number</span>
                <input name="phone" autoComplete="tel" required />
              </label>
              <label>
                <span>Operating state</span>
                <input name="state" required />
              </label>
              <label className="form-grid__wide">
                <span>Registered business address</span>
                <input name="registeredAddress" autoComplete="street-address" required />
              </label>
            </div>
            <button className="button button--primary">
              Continue <ArrowRight />
            </button>
          </form>
        )}
        {step === 2 && (
          <form className="surface-card settings-form" onSubmit={next}>
            <h3>Verify the business and owner</h3>
            <p className="form-note">Documents are stored privately and are only available to authorized verification staff.</p>
            {[
              ["CAC certificate", "cac", cacFile, setCacFile],
              ["Government-issued ID", "identity", identityFile, setIdentityFile],
              ["Proof of business address", "address", addressFile, setAddressFile],
            ].map(([label, name, file, setter]) => (
              <label className="upload-control" key={String(name)}>
                <FileText />
                <span>
                  <strong>{String(label)}</strong>
                  <small>{file instanceof File ? file.name : "PDF, PNG, or JPEG · up to 15 MB"}</small>
                </span>
                <input
                  name={String(name)}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  required={!file}
                  onChange={(event) => (setter as (value: File | null) => void)(event.currentTarget.files?.[0] ?? null)}
                />
              </label>
            ))}
            <div className="form-actions">
              <button type="button" className="button button--secondary" onClick={() => setStep(1)}>Back</button>
              <button className="button button--primary">Continue <ArrowRight /></button>
            </div>
          </form>
        )}
        {step === 3 && (
          <form className="surface-card settings-form" onSubmit={next}>
            <h3>Shape your storefront</h3>
            <label>
              <span>Store name</span>
              <input name="storeName" required />
            </label>
            <label>
              <span>Store description</span>
              <textarea name="description" rows={4} required />
            </label>
            <label className="upload-control">
              <Upload />
              <span>
                <strong>Store logo</strong>
                <small>Square PNG or JPG recommended</small>
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) =>
                  setLogoFile(event.currentTarget.files?.[0] ?? null)
                }
              />
            </label>
            <p className="form-note" aria-live="polite">
              {logoFile
                ? `${logoFile.name} will be uploaded when you submit.`
                : "A logo is optional and can be added later."}
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button className="button button--primary">
                Continue <ArrowRight />
              </button>
            </div>
          </form>
        )}
        {step === 4 && (
          <form className="surface-card settings-form" onSubmit={finish}>
            <h3>Fulfilment preferences</h3>
            <label>
              <span>Dispatch address</span>
              <input name="dispatchAddress" required />
            </label>
            <div className="form-grid">
              <label>
                <span>Typical handling time</span>
                <select name="handlingTime" required>
                  <option value="same-day">Same day</option>
                  <option value="one-day">1 business day</option>
                  <option value="two-days">2 business days</option>
                </select>
              </label>
              <label>
                <span>Support email</span>
                <input type="email" name="supportEmail" required />
              </label>
            </div>
            <label className="check-line">
              <input type="checkbox" required /> I confirm the business
              information is accurate and agree to marketplace seller standards.
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button
                className="button button--primary"
                disabled={save.isPending}
              >
                {save.isPending ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export function SupplierOnboardingPage() {
  const { requestCapability } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: async (body: Record<string, FormDataEntryValue>) => {
      await requestCapability("SUPPLIER", {
        legalName: body.legalName,
        country: body.country,
        supplyCategories: String(body.supplyCategories || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      return api.post("/supplier/profile", {
        displayName: body.displayName,
        description: body.description,
        country: body.country,
        contactEmail: body.contactEmail,
      });
    },
    onSuccess: () => {
      notify("Your supplier application has been submitted for review.");
      navigate("/account");
    },
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  };
  return (
    <>
      <Seo title="Supplier onboarding" noIndex />
      <div className="workspace-page onboarding-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Supplier onboarding</span>
            <h2>Show verified sellers what you can supply.</h2>
            <p>
              Supplier access is separate from retail selling and is reviewed
              before wholesale listings become visible.
            </p>
          </div>
        </header>
        <form className="surface-card settings-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>Legal business name</span>
              <input name="legalName" required />
            </label>
            <label>
              <span>Supplier display name</span>
              <input name="displayName" required />
            </label>
            <label>
              <span>Country</span>
              <input name="country" defaultValue="Nigeria" required />
            </label>
            <label>
              <span>Business email</span>
              <input
                name="contactEmail"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="form-field--full">
              <span>Supply categories</span>
              <input
                name="supplyCategories"
                placeholder="Electronics, packaging, home goods"
                required
              />
            </label>
            <label className="form-field--full">
              <span>Business and capacity summary</span>
              <textarea
                name="description"
                rows={6}
                placeholder="Describe products, typical minimum quantities, lead times and fulfilment capacity."
                required
              />
            </label>
          </div>
          <label className="check-line">
            <input type="checkbox" required /> I confirm these details are
            accurate and understand wholesale access remains unavailable until
            approval.
          </label>
          <button className="button button--primary" disabled={save.isPending}>
            {save.isPending ? "Submitting…" : "Submit supplier application"}
          </button>
        </form>
      </div>
    </>
  );
}

export function SellerStorePage({
  customize = false,
}: {
  customize?: boolean;
}) {
  const { notify } = useToast();
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const store = useQuery({
    queryKey: ["seller", "store"],
    queryFn: () => api.get<Record<string, any>>("/seller/store"),
  });
  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const bannerAssetId = bannerFile
        ? (await uploadPublicImage(bannerFile, "store")).id
        : undefined;
      return api.patch("/seller/store", {
        ...body,
        ...(bannerAssetId ? { bannerAssetId } : {}),
      });
    },
    onSuccess: () => notify("Storefront updated."),
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  };
  return (
    <>
      <Seo
        title={customize ? "Customize storefront" : "Store profile"}
        noIndex
      />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Seller centre</span>
            <h2>{customize ? "Customize storefront" : "Store profile"}</h2>
            <p>Keep your public store accurate, distinctive and useful.</p>
          </div>
          {!customize && (
            <Link
              className="button button--secondary"
              to="/seller/store/customize"
            >
              Customize design
            </Link>
          )}
        </header>
        {store.isLoading ? (
          <PageLoader />
        ) : store.isError ? (
          <ErrorState message={store.error.message} />
        ) : (
          <form className="surface-card settings-form" onSubmit={submit}>
            <div className="store-preview">
              <span>
                <Store />
              </span>
              <div>
                <strong>{store.data?.name ?? "Your store"}</strong>
                <small>
                  {store.data?.slug
                    ? `buysell.ng/store/${store.data.slug}`
                    : "Public link created after approval"}
                </small>
              </div>
              <span className="status">
                <BadgeCheck /> {store.data?.status ?? "Setup"}
              </span>
            </div>
            <div className="form-grid">
              <label>
                <span>Store name</span>
                <input
                  name="name"
                  defaultValue={store.data?.name ?? ""}
                  required
                />
              </label>
              <label>
                <span>Support email</span>
                <input
                  name="supportEmail"
                  type="email"
                  defaultValue={store.data?.supportEmail ?? ""}
                />
              </label>
              <label className="form-field--full">
                <span>Store description</span>
                <textarea
                  name="description"
                  rows={5}
                  defaultValue={store.data?.description ?? ""}
                />
              </label>
            </div>
            {customize && (
              <>
                <label className="upload-control">
                  <Upload />
                  <span>
                    <strong>Cover image</strong>
                    <small>Wide JPG or PNG, up to 5 MB</small>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) =>
                      setBannerFile(event.currentTarget.files?.[0] ?? null)
                    }
                  />
                </label>
                <p className="form-note" aria-live="polite">
                  {bannerFile
                    ? `${bannerFile.name} will replace the current cover image.`
                    : "Leave this empty to keep the current cover image."}
                </p>
              </>
            )}
            <button
              className="button button--primary"
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Save storefront"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

export function ProductEditorPage({ edit = false }: { edit?: boolean }) {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const product = useQuery({
    queryKey: ["seller", "product", productId],
    queryFn: () =>
      api.get<Product>(`/seller/products/${encodeURIComponent(productId)}`),
    enabled: edit && Boolean(productId),
  });
  const categories = useQuery({
    queryKey: ["catalog", "categories", "editor"],
    queryFn: () => api.get<PageResult<Category>>("/catalog/categories"),
    staleTime: 5 * 60_000,
  });
  const save = useMutation({
    mutationFn: async ({
      body,
      files,
    }: {
      body: Record<string, unknown>;
      files: File[];
    }) => {
      const assets = await Promise.all(
        files.map((file) => uploadPublicImage(file, "product")),
      );
      const payload = files.length
        ? { ...body, mediaAssetIds: assets.map((asset) => asset.id) }
        : body;
      return edit
        ? api.patch(
            `/seller/products/${encodeURIComponent(productId)}`,
            payload,
          )
        : api.post("/seller/products", {
            ...payload,
            mediaAssetIds: assets.map((asset) => asset.id),
          });
    },
    onSuccess: () => {
      notify(edit ? "Product updated." : "Product created.");
      navigate("/seller/products");
    },
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const priceKobo = nairaToKoboString(fields.get("price"));
      const compareAtValue = String(fields.get("compareAtPrice") ?? "").trim();
      const compareAtKobo = compareAtValue
        ? nairaToKoboString(compareAtValue)
        : null;
      const categoryId = String(fields.get("categoryId") ?? "").trim();
      const status = String(fields.get("status") ?? "DRAFT");
      const variant = {
        ...(product.data?.variantId ? { id: product.data.variantId } : {}),
        sku: String(fields.get("sku") ?? "").trim(),
        priceKobo,
        compareAtKobo,
        onHand: Number(fields.get("quantity") ?? 0),
      };
      const common = {
        name: String(fields.get("name") ?? "").trim(),
        description: String(fields.get("description") ?? "").trim(),
        categoryId: categoryId || null,
        condition: String(fields.get("condition") ?? "NEW"),
        shippingFeeKobo: "0",
      };
      const body = edit
        ? { ...common, status, primaryVariant: variant }
        : {
            ...common,
            submitForReview: status === "PENDING_REVIEW",
            variants: [variant],
          };
      save.mutate({ body, files: mediaFiles });
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Check the product values.",
        "error",
      );
    }
  };
  if (product.isLoading || categories.isLoading)
    return <PageLoader label="Loading product editor" />;
  const selectedCategory =
    typeof product.data?.category === "object"
      ? product.data.category.id
      : undefined;
  const isPublished = ["ACTIVE", "PAUSED", "OUT_OF_STOCK"].includes(
    product.data?.status ?? "",
  );
  return (
    <>
      <Seo title={edit ? "Edit product" : "New product"} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Product catalog</span>
            <h2>{edit ? "Edit product" : "Add a product"}</h2>
            <p>
              Accurate product information builds buyer confidence and reduces
              returns.
            </p>
          </div>
        </header>
        <form className="editor-layout" onSubmit={submit}>
          <div className="editor-main">
            <section className="surface-card settings-form">
              <h3>Product details</h3>
              <label>
                <span>Product title</span>
                <input
                  name="name"
                  defaultValue={product.data?.name ?? ""}
                  maxLength={120}
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  defaultValue={product.data?.description ?? ""}
                  rows={8}
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Category</span>
                  <select name="categoryId" defaultValue={selectedCategory}>
                    <option value="">Uncategorised</option>
                    {(categories.data?.items ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Condition</span>
                  <select name="condition" defaultValue="NEW">
                    <option value="NEW">New</option>
                    <option value="USED">Used</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </select>
                </label>
              </div>
            </section>
            <section className="surface-card settings-form">
              <h3>Media</h3>
              <label className="upload-control upload-control--large">
                <Upload />
                <span>
                  <strong>Add product images</strong>
                  <small>
                    Use clear JPG, PNG or WebP images. First image becomes the
                    cover.
                  </small>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) =>
                    setMediaFiles(Array.from(event.currentTarget.files ?? []))
                  }
                />
              </label>
              <p className="form-note" aria-live="polite">
                {mediaFiles.length
                  ? `${mediaFiles.length} image${mediaFiles.length === 1 ? "" : "s"} ready to upload.`
                  : edit
                    ? "Choose new images only when you want to replace the current gallery."
                    : "You can save a draft without images, then add them before review."}
              </p>
            </section>
            <section className="surface-card settings-form">
              <h3>Price & inventory</h3>
              <div className="form-grid">
                <label>
                  <span>Price (NGN)</span>
                  <input
                    name="price"
                    inputMode="numeric"
                    defaultValue={product.data?.price ?? ""}
                    required
                  />
                </label>
                <label>
                  <span>Compare-at price</span>
                  <input
                    name="compareAtPrice"
                    inputMode="numeric"
                    defaultValue={product.data?.compareAtPrice ?? ""}
                  />
                </label>
                <label>
                  <span>SKU</span>
                  <input
                    name="sku"
                    defaultValue={product.data?.sku ?? ""}
                    required
                  />
                </label>
                <label>
                  <span>Available quantity</span>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    defaultValue={product.data?.stock ?? 0}
                    required
                  />
                </label>
              </div>
            </section>
          </div>
          <aside className="editor-side">
            <section className="surface-card settings-form">
              <h3>Publishing</h3>
              <label>
                <span>Status</span>
                <select
                  name="status"
                  defaultValue={product.data?.status ?? "DRAFT"}
                >
                  {isPublished ? (
                    <>
                      <option value="ACTIVE">Published</option>
                      <option value="PAUSED">Paused</option>
                    </>
                  ) : (
                    <>
                      <option value="DRAFT">Save as draft</option>
                      <option value="PENDING_REVIEW">Submit for review</option>
                    </>
                  )}
                </select>
              </label>
              <button
                className="button button--primary button--full"
                disabled={save.isPending}
              >
                {save.isPending
                  ? "Saving…"
                  : edit
                    ? "Save changes"
                    : "Create product"}
              </button>
              <Link
                className="button button--text button--full"
                to="/seller/products"
              >
                Cancel
              </Link>
            </section>
            <section className="surface-card helper-card">
              <ShieldCheck />
              <h3>Quality checklist</h3>
              <ul>
                <li>Specific, searchable title</li>
                <li>Original, well-lit images</li>
                <li>Honest specifications</li>
                <li>Accurate stock count</li>
              </ul>
            </section>
          </aside>
        </form>
      </div>
    </>
  );
}

export function SupplierProductEditorPage({
  edit = false,
}: {
  edit?: boolean;
}) {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const product = useQuery({
    queryKey: ["supplier", "product", productId],
    queryFn: () =>
      api.get<Record<string, any>>(
        `/supplier/catalog/${encodeURIComponent(productId)}`,
      ),
    enabled: edit && Boolean(productId),
  });
  const save = useMutation({
    mutationFn: async ({
      body,
      files,
    }: {
      body: Record<string, unknown>;
      files: File[];
    }) => {
      const assets = await Promise.all(
        files.map((file) => uploadPublicImage(file, "product")),
      );
      const uploadedMedia = assets.map((asset, index) => {
        if (!asset.publicUrl)
          throw new Error("The uploaded image did not return a public URL.");
        return {
          url: asset.publicUrl,
          alt: `${String(body.name)} image ${index + 1}`,
        };
      });
      const basePayload = edit
        ? body
        : Object.fromEntries(
            Object.entries(body).filter(([, value]) => value !== null),
          );
      const payload = files.length
        ? { ...basePayload, media: uploadedMedia }
        : basePayload;
      return edit
        ? api.patch(
            `/supplier/catalog/${encodeURIComponent(productId)}`,
            payload,
          )
        : api.post("/supplier/catalog", { ...payload, media: uploadedMedia });
    },
    onSuccess: () => {
      notify(edit ? "Wholesale listing updated." : "Wholesale listing saved.");
      navigate("/supplier/catalog");
    },
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const priceTiers = String(fields.get("priceTiers") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [minimum, price, ...extra] = line.split(":");
          if (!minimum || !price || extra.length || !/^\d+$/.test(minimum.trim()))
            throw new Error(
              "Use one volume tier per line in the format quantity: price.",
            );
          return {
            minimumQuantity: Number(minimum.trim()),
            unitPriceKobo: nairaToKoboString(price.trim()),
          };
        });
      const listingStatus = String(fields.get("listingStatus") ?? "DRAFT");
      const maximum = String(fields.get("maximumOrderQty") ?? "").trim();
      const suggested = String(fields.get("suggestedPrice") ?? "").trim();
      const sourceUrl = String(fields.get("sourceUrl") ?? "").trim();
      const leadTime = String(fields.get("leadTimeDays") ?? "").trim();
      const body = {
        sku: String(fields.get("sku") ?? "").trim(),
        name: String(fields.get("name") ?? "").trim(),
        description: String(fields.get("description") ?? "").trim(),
        costKobo: nairaToKoboString(fields.get("costPrice")),
        suggestedKobo: suggested ? nairaToKoboString(suggested) : null,
        stockQuantity: Number(fields.get("stockQuantity") ?? 0),
        category: String(fields.get("category") ?? "").trim() || null,
        unit: String(fields.get("unit") ?? "unit").trim(),
        minimumOrderQty: Number(fields.get("minimumOrderQty") ?? 1),
        maximumOrderQty: maximum ? Number(maximum) : null,
        leadTimeDays: leadTime ? Number(leadTime) : null,
        sourceUrl: sourceUrl || null,
        tags: String(fields.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        priceTiers,
        ...(listingStatus === "UNCHANGED" ? {} : { listingStatus }),
      };
      save.mutate({ body, files: mediaFiles });
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Check the listing values.",
        "error",
      );
    }
  };
  if (product.isLoading) return <PageLoader label="Loading wholesale listing" />;
  if (product.isError)
    return (
      <ErrorState
        title="Wholesale listing unavailable"
        message={product.error.message}
        onRetry={() => void product.refetch()}
      />
    );
  const current = product.data;
  const currentStatus = String(current?.listingStatus ?? "DRAFT");
  const currentTiers = Array.isArray(current?.priceTiers)
    ? current.priceTiers
        .map(
          (tier: Record<string, unknown>) =>
            `${tier.minimumQuantity}: ${Number(tier.unitPriceKobo ?? 0) / 100}`,
        )
        .join("\n")
    : "";
  return (
    <>
      <Seo title={edit ? "Edit wholesale listing" : "New wholesale listing"} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Supplier portal</span>
            <h2>{edit ? "Edit wholesale listing" : "Create a wholesale listing"}</h2>
            <p>
              Listings stay seller-only and require moderation before publication.
            </p>
          </div>
        </header>
        <form className="editor-layout" onSubmit={submit}>
          <div className="editor-main">
            <section className="surface-card settings-form">
              <h3>Listing details</h3>
              <div className="form-grid">
                <label>
                  <span>Product name</span>
                  <input name="name" defaultValue={current?.name ?? ""} required />
                </label>
                <label>
                  <span>Supplier SKU</span>
                  <input name="sku" defaultValue={current?.sku ?? ""} required />
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  rows={7}
                  defaultValue={current?.description ?? ""}
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Category</span>
                  <input name="category" defaultValue={current?.category ?? ""} />
                </label>
                <label>
                  <span>Unit</span>
                  <input name="unit" defaultValue={current?.unit ?? "unit"} required />
                </label>
              </div>
              <label>
                <span>Tags</span>
                <input
                  name="tags"
                  defaultValue={Array.isArray(current?.tags) ? current.tags.join(", ") : ""}
                  placeholder="electronics, office, bulk"
                />
              </label>
              <label>
                <span>Source URL (private supplier reference)</span>
                <input
                  name="sourceUrl"
                  type="url"
                  defaultValue={current?.sourceUrl ?? ""}
                />
              </label>
            </section>
            <section className="surface-card settings-form">
              <h3>Pricing and inventory</h3>
              <div className="form-grid">
                <label>
                  <span>Unit price (NGN)</span>
                  <input
                    name="costPrice"
                    inputMode="decimal"
                    defaultValue={current ? Number(current.costKobo ?? 0) / 100 : ""}
                    required
                  />
                </label>
                <label>
                  <span>Suggested resale price (NGN)</span>
                  <input
                    name="suggestedPrice"
                    inputMode="decimal"
                    defaultValue={current?.suggestedKobo ? Number(current.suggestedKobo) / 100 : ""}
                  />
                </label>
                <label>
                  <span>On-hand stock</span>
                  <input
                    name="stockQuantity"
                    type="number"
                    min="0"
                    defaultValue={current?.inventory?.onHand ?? current?.stockQuantity ?? 0}
                    required
                  />
                </label>
                <label>
                  <span>Lead time (days)</span>
                  <input
                    name="leadTimeDays"
                    type="number"
                    min="0"
                    max="365"
                    defaultValue={current?.leadTimeDays ?? ""}
                  />
                </label>
                <label>
                  <span>Minimum order</span>
                  <input
                    name="minimumOrderQty"
                    type="number"
                    min="1"
                    defaultValue={current?.minimumOrderQty ?? 1}
                    required
                  />
                </label>
                <label>
                  <span>Maximum order</span>
                  <input
                    name="maximumOrderQty"
                    type="number"
                    min="1"
                    defaultValue={current?.maximumOrderQty ?? ""}
                  />
                </label>
              </div>
              <label>
                <span>Volume tiers</span>
                <textarea
                  name="priceTiers"
                  rows={4}
                  defaultValue={currentTiers}
                  placeholder={"10: 4500\n50: 4100"}
                />
                <small>One tier per line: minimum quantity, colon, unit price.</small>
              </label>
            </section>
            <section className="surface-card settings-form">
              <h3>Images</h3>
              <label className="upload-control upload-control--large">
                <Upload />
                <span>
                  <strong>Add listing images</strong>
                  <small>Public JPG, PNG or WebP images, up to 12.</small>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) =>
                    setMediaFiles(Array.from(event.currentTarget.files ?? []).slice(0, 12))
                  }
                />
              </label>
              <p className="form-note" aria-live="polite">
                {mediaFiles.length
                  ? `${mediaFiles.length} image${mediaFiles.length === 1 ? "" : "s"} ready to upload.`
                  : edit
                    ? "Leave empty to keep the current images."
                    : "Images can also be added before submitting for review."}
              </p>
            </section>
          </div>
          <aside className="editor-side">
            <section className="surface-card settings-form">
              <h3>Publication</h3>
              <label>
                <span>Status</span>
                <select
                  name="listingStatus"
                  defaultValue={
                    ["ACTIVE", "PAUSED"].includes(currentStatus)
                      ? "UNCHANGED"
                      : ["DRAFT", "PENDING"].includes(currentStatus)
                        ? currentStatus
                        : "DRAFT"
                  }
                >
                  {["ACTIVE", "PAUSED"].includes(currentStatus) ? (
                    <>
                      <option value="UNCHANGED">Keep {titleFromSlug(currentStatus).toLowerCase()}</option>
                      <option value="PENDING">Submit changes for review</option>
                      <option value="PAUSED">Pause listing</option>
                    </>
                  ) : (
                    <>
                      <option value="DRAFT">Save as draft</option>
                      <option value="PENDING">Submit for review</option>
                    </>
                  )}
                </select>
              </label>
              <button
                className="button button--primary button--full"
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : edit ? "Save changes" : "Save listing"}
              </button>
              <Link className="button button--text button--full" to="/supplier/catalog">
                Cancel
              </Link>
            </section>
          </aside>
        </form>
      </div>
    </>
  );
}

export function SellerSourcingEditorPage() {
  const { requestId } = useParams();
  const { notify } = useToast();
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) =>
      api.post("/sourcing/requests", {
        desiredDeliveryAt: body.targetDate || undefined,
        notes: body.description,
        items: [
          {
            title: body.productName,
            description: body.description,
            quantity: Number(body.quantity),
            referenceUrl: body.referenceUrl || undefined,
          },
        ],
      }),
    onSuccess: () => {
      notify("Sourcing request submitted.");
      navigate("/seller/sourcing");
    },
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  };
  return (
    <>
      <Seo
        title={requestId ? "Sourcing request" : "New sourcing request"}
        noIndex
      />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Product sourcing</span>
            <h2>{requestId ? `Request ${requestId}` : "Request a quote"}</h2>
            <p>Share any reference and the details your business needs.</p>
          </div>
        </header>
        <form
          className="surface-card settings-form narrow-form"
          onSubmit={submit}
        >
          <label>
            <span>Product name</span>
            <input name="productName" required />
          </label>
          <label>
            <span>
              Reference URL <small>optional</small>
            </span>
            <input
              name="referenceUrl"
              type="url"
              placeholder="https://example.com/item"
            />
          </label>
          <div className="form-grid">
            <label>
              <span>Quantity</span>
              <input name="quantity" type="number" min="1" required />
            </label>
            <label>
              <span>Target date</span>
              <input name="targetDate" type="date" />
            </label>
          </div>
          <label>
            <span>Specifications</span>
            <textarea name="description" rows={6} required />
          </label>
          <p className="form-note">
            Reference files can be added securely after the request is created.
          </p>
          <button className="button button--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Submit for review"}
          </button>
        </form>
      </div>
    </>
  );
}

export function WorkspaceDetailPage({
  kind,
  section,
}: {
  kind: WorkspaceKind;
  section: string;
}) {
  const params = useParams();
  const id = Object.values(params)[0] ?? "";
  const endpoint = `/${kind}/${section}/${encodeURIComponent(id)}`;
  const record = useQuery({
    queryKey: [kind, section, id],
    queryFn: () => api.get<Record<string, any>>(endpoint),
  });
  const { notify } = useToast();
  const action = useMutation({
    mutationFn: ({
      method = "PATCH",
      path,
      body,
    }: {
      method?: "PATCH" | "POST";
      path: string;
      body: Record<string, unknown>;
    }) =>
      method === "POST" ? api.post(path, body) : api.patch(path, body),
    onSuccess: () => {
      notify("The record was updated.");
      void record.refetch();
    },
    onError: (error) => notify(error.message, "error"),
  });
  const currentStatus = String(record.data?.status ?? "");
  const nextStatuses =
    kind === "seller" && section === "orders"
      ? (sellerOrderTransitions[currentStatus] ?? [])
      : kind === "supplier" && section === "orders"
        ? (supplierOrderTransitions[currentStatus] ?? [])
        : [];
  const canModerate =
    kind === "admin" &&
    ["products", "wholesale-products"].includes(section);
  const canQuote = kind === "supplier" && section === "requests";
  const hasActions = canModerate || canQuote || nextStatuses.length > 0;
  return (
    <>
      <Seo title={`${titleFromSlug(section)} record`} noIndex />
      <div className="workspace-page">
        <Link
          className="back-link"
          to={
            kind === "admin"
              ? `/buysell-super-admin/${section}`
              : `/${kind}/${section}`
          }
        >
          ← Back to {titleFromSlug(section)}
        </Link>
        {record.isLoading ? (
          <PageLoader />
        ) : record.isError ? (
          <ErrorState
            title="Record unavailable"
            message={record.error.message}
            onRetry={() => void record.refetch()}
          />
        ) : (
          <>
            <header className="workspace-page__heading">
              <div>
                <span className="eyebrow">{titleFromSlug(section)}</span>
                <h2>
                  {record.data?.name ??
                    record.data?.title ??
                    record.data?.orderNumber ??
                    id}
                </h2>
                <p>
                  {record.data?.description ??
                    "Review the full record and its audit trail."}
                </p>
              </div>
              <span className="status">
                {titleFromSlug(record.data?.status ?? "Active")}
              </span>
            </header>
            <div
              className={`record-grid${hasActions ? "" : " record-grid--single"}`}
            >
              <section className="surface-card record-details">
                <h3>Details</h3>
                <dl>
                  {Object.entries(record.data ?? {})
                    .filter(
                      ([key, value]) =>
                        !["id", "description"].includes(key) &&
                        ["string", "number", "boolean"].includes(typeof value),
                    )
                    .slice(0, 12)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{titleFromSlug(key)}</dt>
                        <dd>
                          {key.toLowerCase().includes("price") ||
                          key.toLowerCase().includes("total")
                            ? formatMoney(value as number)
                            : String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </section>
              {hasActions && (
                <aside className="surface-card settings-form">
                  <h3>
                    {canModerate
                      ? "Moderation decision"
                      : canQuote
                        ? "Submit a quote"
                        : "Move fulfilment forward"}
                  </h3>
                  {canModerate ? (
                    <form
                      className="settings-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const fields = new FormData(event.currentTarget);
                        action.mutate({
                          path: `${endpoint}/moderation`,
                          body: {
                            status: fields.get("status"),
                            reason: fields.get("reason"),
                          },
                        });
                      }}
                    >
                      <label>
                        <span>Decision</span>
                        <select name="status" required>
                          <option value="ACTIVE">Approve and publish</option>
                          <option value="REJECTED">Reject</option>
                          <option value="PAUSED">Pause</option>
                        </select>
                      </label>
                      <label>
                        <span>Audited reason</span>
                        <textarea name="reason" rows={4} required />
                      </label>
                      <button
                        className="button button--primary button--full"
                        disabled={action.isPending}
                      >
                        {action.isPending ? "Saving…" : "Save decision"}
                      </button>
                    </form>
                  ) : canQuote ? (
                    <form
                      className="settings-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const fields = new FormData(event.currentTarget);
                        try {
                          action.mutate({
                            method: "POST",
                            path: `${endpoint}/quotes`,
                            body: {
                              unitPriceKobo: nairaToKoboString(
                                fields.get("unitPrice"),
                              ),
                              shippingKobo: nairaToKoboString(
                                fields.get("shipping") || "0",
                              ),
                              leadTimeDays: Number(fields.get("leadTimeDays")),
                              minimumOrderQty: Number(
                                fields.get("minimumOrderQty"),
                              ),
                              expiresAt: fields.get("expiresAt"),
                              terms: fields.get("terms"),
                            },
                          });
                        } catch (error) {
                          notify(
                            error instanceof Error
                              ? error.message
                              : "Check the quote values.",
                            "error",
                          );
                        }
                      }}
                    >
                      <label>
                        <span>Unit price (NGN)</span>
                        <input name="unitPrice" inputMode="decimal" required />
                      </label>
                      <label>
                        <span>Shipping (NGN)</span>
                        <input
                          name="shipping"
                          inputMode="decimal"
                          defaultValue="0"
                          required
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          <span>Lead time (days)</span>
                          <input
                            name="leadTimeDays"
                            type="number"
                            min="1"
                            required
                          />
                        </label>
                        <label>
                          <span>Minimum quantity</span>
                          <input
                            name="minimumOrderQty"
                            type="number"
                            min="1"
                            defaultValue="1"
                            required
                          />
                        </label>
                      </div>
                      <label>
                        <span>Quote expiry</span>
                        <input name="expiresAt" type="datetime-local" required />
                      </label>
                      <label>
                        <span>Terms</span>
                        <textarea name="terms" rows={3} />
                      </label>
                      <button
                        className="button button--primary button--full"
                        disabled={action.isPending}
                      >
                        {action.isPending ? "Sending…" : "Submit quote"}
                      </button>
                    </form>
                  ) : (
                    <form
                      className="settings-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const fields = new FormData(event.currentTarget);
                        action.mutate({
                          path: `${endpoint}/status`,
                          body: {
                            status: fields.get("status"),
                            note: fields.get("note") || undefined,
                          },
                        });
                      }}
                    >
                      <label>
                        <span>Next status</span>
                        <select name="status" required>
                          {nextStatuses.map((status) => (
                            <option key={status} value={status}>
                              {titleFromSlug(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Fulfilment note</span>
                        <textarea name="note" rows={3} />
                      </label>
                      <button
                        className="button button--primary button--full"
                        disabled={action.isPending}
                      >
                        {action.isPending ? "Updating…" : "Update status"}
                      </button>
                    </form>
                  )}
                </aside>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

interface AdminConfig {
  title: string;
  intro: string;
  endpoint: string;
  columns: string[];
  empty: string;
  createPath?: string;
}

const adminConfig: Record<string, AdminConfig> = {
  users: {
    title: "Users",
    intro: "Review accounts, access and marketplace participation.",
    endpoint: "/admin/users",
    columns: ["User", "Roles", "Status", "Joined"],
    empty: "No users match this view.",
  },
  buyers: {
    title: "Buyers",
    intro:
      "Understand buyer activity without exposing unnecessary personal data.",
    endpoint: "/admin/buyers",
    columns: ["Buyer", "Orders", "Status", "Value"],
    empty: "No buyers match this view.",
  },
  sellers: {
    title: "Sellers",
    intro: "Review seller status, store health and verification.",
    endpoint: "/admin/sellers",
    columns: ["Seller", "Store", "Status", "Sales"],
    empty: "No sellers match this view.",
  },
  suppliers: {
    title: "Suppliers",
    intro: "Manage distinct supplier profiles, capabilities and verification.",
    endpoint: "/admin/suppliers",
    columns: ["Supplier", "Capability", "Status", "Updated"],
    empty: "No suppliers match this view.",
  },
  products: {
    title: "Product moderation",
    intro: "Review marketplace listings and quality signals.",
    endpoint: "/admin/products",
    columns: ["Product", "Seller", "Status", "Price"],
    empty: "No products require review.",
  },
  "wholesale-products": {
    title: "Wholesale moderation",
    intro:
      "Review seller-only supplier listings before they enter the digital warehouse.",
    endpoint: "/admin/wholesale-products",
    columns: ["Listing", "Supplier", "Status", "Minimum"],
    empty: "No wholesale listings require review.",
  },
  categories: {
    title: "Categories",
    intro: "Maintain a useful, stable marketplace taxonomy.",
    endpoint: "/admin/categories",
    columns: ["Category", "Products", "Status", "Updated"],
    empty: "No categories are available.",
  },
  orders: {
    title: "Orders",
    intro: "Inspect order state, fulfilment and support context.",
    endpoint: "/admin/orders",
    columns: ["Order", "Buyer", "Status", "Total"],
    empty: "No orders match this view.",
  },
  payments: {
    title: "Payments",
    intro: "Monitor provider verification, reconciliation and exceptions.",
    endpoint: "/admin/payments",
    columns: ["Payment", "Order", "Status", "Amount"],
    empty: "No payment records match this view.",
  },
  finance: {
    title: "Marketplace finance",
    intro: "Review the immutable ledger, balances and reconciliation.",
    endpoint: "/admin/finance",
    columns: ["Entry", "Account", "Type", "Amount"],
    empty: "No finance entries match this view.",
  },
  commissions: {
    title: "Commissions",
    intro: "Review platform commission entries and calculation rules.",
    endpoint: "/admin/commissions",
    columns: ["Order", "Seller", "Rate", "Commission"],
    empty: "No commission entries match this view.",
  },
  payouts: {
    title: "Payout operations",
    intro: "Review holds, approvals, provider status and release history.",
    endpoint: "/admin/payouts",
    columns: ["Payout", "Seller", "Status", "Amount"],
    empty: "No payouts match this view.",
  },
  disputes: {
    title: "Disputes",
    intro: "Resolve buyer and seller cases with complete order evidence.",
    endpoint: "/admin/disputes",
    columns: ["Case", "Order", "Priority", "Status"],
    empty: "No disputes match this view.",
  },
  kyc: {
    title: "Verification queue",
    intro:
      "Review sensitive identity and business documents with least-privilege access.",
    endpoint: "/admin/kyc",
    columns: ["Submission", "Owner", "Type", "Status"],
    empty: "No verification submissions need review.",
  },
  sourcing: {
    title: "Sourcing operations",
    intro: "Review public requests alongside restricted procurement details.",
    endpoint: "/admin/sourcing",
    columns: ["Request", "Requester", "Status", "Quote"],
    empty: "No sourcing requests match this view.",
  },
  advertising: {
    title: "Advertising",
    intro: "Moderate campaigns, placements and campaign spend.",
    endpoint: "/admin/advertising",
    columns: ["Campaign", "Seller", "Status", "Spend"],
    empty: "No advertising campaigns match this view.",
  },
  broadcasts: {
    title: "Broadcasts",
    intro: "Create targeted, auditable marketplace communications.",
    endpoint: "/admin/broadcasts",
    columns: ["Campaign", "Audience", "Status", "Delivery"],
    empty: "No broadcasts have been created.",
    createPath: "/buysell-super-admin/broadcasts/new",
  },
  messages: {
    title: "Message oversight",
    intro: "Review escalated communications with a documented reason.",
    endpoint: "/admin/messages",
    columns: ["Conversation", "Participants", "Status", "Updated"],
    empty: "No conversations are escalated.",
  },
  notifications: {
    title: "Notifications",
    intro: "Review notification templates, delivery and failures.",
    endpoint: "/admin/notifications",
    columns: ["Notification", "Channel", "Status", "Delivered"],
    empty: "No notification activity matches this view.",
  },
  analytics: {
    title: "Marketplace analytics",
    intro: "Analyse trustworthy server-side marketplace data.",
    endpoint: "/admin/analytics",
    columns: ["Report", "Period", "Status", "Updated"],
    empty: "No reports are available.",
  },
  "audit-logs": {
    title: "Audit logs",
    intro: "Trace privileged actions across the platform.",
    endpoint: "/admin/audit-logs",
    columns: ["Actor", "Action", "Target", "Occurred"],
    empty: "No audit events match this view.",
  },
  settings: {
    title: "Platform settings",
    intro: "Manage validated operational settings with an audit trail.",
    endpoint: "/admin/settings",
    columns: ["Setting", "Scope", "Status", "Updated"],
    empty: "No platform settings are available.",
  },
  content: {
    title: "Content",
    intro: "Manage approved marketplace guidance and editorial content.",
    endpoint: "/admin/content",
    columns: ["Content", "Type", "Status", "Updated"],
    empty: "No content records match this view.",
  },
};

interface CapabilityApplicationRecord {
  id: string;
  capability: "SELLER" | "SUPPLIER";
  status: string;
  submittedAt: string;
  payload: Record<string, unknown>;
  user: {
    email?: string;
    profile?: { displayName?: string };
    capabilities?: Array<{ capability: string; status: string }>;
    kycSubmissions?: Array<{
      id: string;
      subjectType: string;
      status: string;
      submittedAt?: string;
      documents: Array<{
        id: string;
        documentType: string;
        mediaAssetId: string;
      }>;
    }>;
  };
  decisions: Array<{
    id: string;
    decision: string;
    reason: string;
    createdAt: string;
  }>;
}

export function AdminCapabilityApplicationsPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [selected, setSelected] = useState<CapabilityApplicationRecord | null>(
    null,
  );
  const applications = useQuery({
    queryKey: ["admin", "capability-applications"],
    queryFn: () =>
      api.get<PageResult<CapabilityApplicationRecord>>(
        "/admin/capability-applications?status=SUBMITTED",
      ),
  });
  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: string;
      reason: string;
    }) =>
      api.post(
        `/admin/capability-applications/${encodeURIComponent(id)}/decision`,
        { decision, reason },
      ),
    onSuccess: () => {
      notify("Capability decision saved and audited.");
      setSelected(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "capability-applications"],
      });
    },
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    decide.mutate({
      id: selected.id,
      decision: String(form.get("decision")),
      reason: String(form.get("reason")),
    });
  };
  const openDocument = async (assetId: string) => {
    try {
      const access = await api.get<{ url: string }>(
        `/media/assets/${encodeURIComponent(assetId)}/access`,
      );
      window.open(access.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(error instanceof Error ? error.message : "The document could not be opened.", "error");
    }
  };
  const selectedKyc = selected?.user.kycSubmissions?.find(
    (submission) => submission.subjectType === "STORE",
  );
  return (
    <>
      <Seo title="Capability applications · Control room" noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Super admin</span>
            <h2>Capability applications</h2>
            <p>
              Approve seller and supplier access independently, with a permanent
              reason and decision trail.
            </p>
          </div>
        </header>
        <div className="review-layout">
          <section className="surface-card review-queue">
            <h3>Awaiting review</h3>
            {applications.isLoading ? (
              <PageLoader />
            ) : applications.isError ? (
              <ErrorState
                message={applications.error.message}
                onRetry={() => void applications.refetch()}
              />
            ) : !applications.data?.items.length ? (
              <EmptyState
                title="Review queue is clear"
                message="New seller and supplier applications will appear here."
              />
            ) : (
              applications.data.items.map((application) => (
                <button
                  className={selected?.id === application.id ? "is-active" : ""}
                  key={application.id}
                  onClick={() => setSelected(application)}
                >
                  <span>
                    {application.capability === "SELLER" ? (
                      <Store />
                    ) : (
                      <Truck />
                    )}
                  </span>
                  <div>
                    <strong>
                      {application.user.profile?.displayName ||
                        application.user.email ||
                        "BUYSELL member"}
                    </strong>
                    <small>
                      {titleFromSlug(application.capability)} · submitted{" "}
                      {formatDate(application.submittedAt)}
                    </small>
                  </div>
                  <span className="status">
                    {titleFromSlug(application.status)}
                  </span>
                  <ChevronRight />
                </button>
              ))
            )}
          </section>
          <aside className="surface-card review-panel">
            {selected ? (
              <form className="settings-form" onSubmit={submit}>
                <div>
                  <span className="eyebrow">Decision</span>
                  <h3>
                    {selected.user.profile?.displayName || selected.user.email}
                  </h3>
                  <p>{titleFromSlug(selected.capability)} application</p>
                </div>
                <dl className="application-summary">
                  {Object.entries(selected.payload || {})
                    .slice(0, 8)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{titleFromSlug(key)}</dt>
                        <dd>
                          {Array.isArray(value)
                            ? value.join(", ")
                            : String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
                {selected.capability === "SELLER" && (
                  <section className="verification-summary">
                    <div>
                      <h4>Verification documents</h4>
                      <span className={`status status--${(selectedKyc?.status || "missing").toLowerCase()}`}>
                        {selectedKyc ? titleFromSlug(selectedKyc.status) : "Missing"}
                      </span>
                    </div>
                    {selectedKyc?.documents.length ? (
                      selectedKyc.documents.map((document) => (
                        <button
                          type="button"
                          className="button button--secondary"
                          key={document.id}
                          onClick={() => void openDocument(document.mediaAssetId)}
                        >
                          <FileText /> View {titleFromSlug(document.documentType)}
                        </button>
                      ))
                    ) : (
                      <p className="form-note">CAC certificate, government ID, and proof of address are required before seller approval.</p>
                    )}
                  </section>
                )}
                <label>
                  <span>Decision</span>
                  <select name="decision" required>
                    <option value="APPROVE">Approve capability</option>
                    <option value="REJECT">Reject application</option>
                    <option value="SUSPEND">Suspend capability</option>
                    <option value="REINSTATE">Reinstate capability</option>
                    <option value="REVOKE">Revoke capability</option>
                  </select>
                </label>
                <label>
                  <span>Reason</span>
                  <textarea
                    name="reason"
                    rows={5}
                    minLength={3}
                    required
                    placeholder="Record the evidence-based reason for this decision."
                  />
                </label>
                <button
                  className="button button--primary"
                  disabled={decide.isPending}
                >
                  {decide.isPending ? "Saving…" : "Save audited decision"}
                </button>
              </form>
            ) : (
              <div className="review-panel__empty">
                <ShieldCheck />
                <h3>Select an application</h3>
                <p>
                  Review submitted details, then record a clear decision reason.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

export function AdminListPage({ section }: { section: string }) {
  const config = adminConfig[section] ?? {
    title: titleFromSlug(section),
    intro: `Manage ${titleFromSlug(section).toLowerCase()} across BUYSELL.`,
    endpoint: `/admin/${section}`,
    columns: ["Record", "Owner", "Status", "Updated"],
    empty: "No records match this view.",
  };
  const [query, setQuery] = useState("");
  const records = useQuery({
    queryKey: ["admin", section, query],
    queryFn: () =>
      api.get<PageResult<ActivityRow | Record<string, any>>>(
        `${config.endpoint}?q=${encodeURIComponent(query)}`,
      ),
  });
  return (
    <>
      <Seo title={`${config.title} · Control room`} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Control room</span>
            <h2>{config.title}</h2>
            <p>{config.intro}</p>
          </div>
          {config.createPath && (
            <Link className="button button--primary" to={config.createPath}>
              <Plus /> New broadcast
            </Link>
          )}
        </header>
        <section className="surface-card data-section">
          <div className="data-toolbar">
            <label>
              <Search />
              <span className="sr-only">Search {config.title}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}`}
              />
            </label>
            <button
              className="button button--secondary"
              disabled={!records.data?.items.length}
              onClick={() =>
                downloadCsv(
                  `buysell-admin-${section}.csv`,
                  records.data?.items ?? [],
                )
              }
            >
              <Download /> Export CSV
            </button>
          </div>
          {records.isLoading ? (
            <PageLoader />
          ) : records.isError ? (
            <ErrorState
              title={`${config.title} unavailable`}
              message={records.error.message}
              onRetry={() => void records.refetch()}
            />
          ) : !records.data?.items.length ? (
            <EmptyState
              title={`No ${config.title.toLowerCase()}`}
              message={config.empty}
            />
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.data.items.map((item, index) => (
                    <WorkspaceRow
                      item={item}
                      key={String(item.id ?? index)}
                      href={
                        [
                          "users",
                          "sellers",
                          "suppliers",
                          "products",
                          "wholesale-products",
                          "orders",
                          "disputes",
                          "kyc",
                          "sourcing",
                          "advertising",
                        ].includes(section)
                          ? `/buysell-super-admin/${section}/${String(item.id)}`
                          : null
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function AdminBroadcastEditorPage() {
  const { campaignId } = useParams();
  const { notify } = useToast();
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) =>
      campaignId
        ? api.patch(`/admin/broadcasts/${encodeURIComponent(campaignId)}`, body)
        : api.post("/admin/broadcasts", body),
    onSuccess: () => {
      notify("Broadcast saved.");
      navigate("/buysell-super-admin/broadcasts");
    },
    onError: (error) => notify(error.message, "error"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  };
  return (
    <>
      <Seo title={campaignId ? "Edit broadcast" : "New broadcast"} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">Controlled communication</span>
            <h2>{campaignId ? "Edit broadcast" : "Create broadcast"}</h2>
            <p>
              Choose a clear audience and preview the content before scheduling.
            </p>
          </div>
        </header>
        <form className="editor-layout" onSubmit={submit}>
          <div className="editor-main">
            <section className="surface-card settings-form">
              <h3>Message</h3>
              <label>
                <span>Campaign name</span>
                <input name="name" required />
              </label>
              <label>
                <span>Title</span>
                <input name="title" maxLength={80} required />
              </label>
              <label>
                <span>Body</span>
                <textarea name="body" rows={7} maxLength={600} required />
              </label>
            </section>
            <section className="surface-card settings-form">
              <h3>Audience</h3>
              <label>
                <span>Segment</span>
                <select name="audience" required>
                  <option value="">Choose audience</option>
                  <option value="all-buyers">All active buyers</option>
                  <option value="all-sellers">All active sellers</option>
                  <option value="seller-action">
                    Sellers requiring action
                  </option>
                </select>
              </label>
              <label>
                <span>Channel</span>
                <select name="channel">
                  <option value="in-app">In-app notification</option>
                  <option value="email">Email</option>
                  <option value="push">Push notification</option>
                </select>
              </label>
            </section>
          </div>
          <aside className="editor-side">
            <section className="surface-card settings-form">
              <h3>Schedule</h3>
              <label>
                <span>Send at</span>
                <input type="datetime-local" name="scheduledAt" />
              </label>
              <button
                className="button button--primary button--full"
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save broadcast"}
              </button>
              <Link
                className="button button--text button--full"
                to="/buysell-super-admin/broadcasts"
              >
                Cancel
              </Link>
            </section>
            <section className="surface-card helper-card">
              <ShieldCheck />
              <h3>Before sending</h3>
              <ul>
                <li>Audience is necessary and proportionate</li>
                <li>Copy is accurate and action-oriented</li>
                <li>Links use approved BUYSELL routes</li>
              </ul>
            </section>
          </aside>
        </form>
      </div>
    </>
  );
}

export function FinancePage({ admin = false }: { admin?: boolean }) {
  const endpoint = admin ? "/admin/finance" : "/seller/finance";
  const finance = useQuery({
    queryKey: [admin ? "admin" : "seller", "finance-summary"],
    queryFn: () => api.get<DashboardData>(endpoint),
  });
  return (
    <>
      <Seo title={admin ? "Marketplace finance" : "Store finance"} noIndex />
      <div className="workspace-page">
        <header className="workspace-page__heading">
          <div>
            <span className="eyebrow">
              {admin ? "Control room" : "Seller centre"}
            </span>
            <h2>{admin ? "Marketplace finance" : "Finance"}</h2>
            <p>
              {admin
                ? "Reconcile platform money movement against provider-confirmed events."
                : "See settled sales, deductions and funds available for payout."}
            </p>
          </div>
          <button
            className="button button--secondary"
            disabled={!finance.data?.rows.length}
            onClick={() =>
              downloadCsv(
                `buysell-${admin ? "platform" : "store"}-statement.csv`,
                finance.data?.rows ?? [],
              )
            }
          >
            <Download /> Download statement
          </button>
        </header>
        {finance.isLoading ? (
          <PageLoader />
        ) : finance.isError ? (
          <ErrorState
            message={finance.error.message}
            onRetry={() => void finance.refetch()}
          />
        ) : (
          finance.data && (
            <>
              <MetricGrid metrics={finance.data.metrics} />
              <RecentActivity
                title="Recent transactions"
                rows={finance.data.rows}
              />
            </>
          )
        )}
      </div>
    </>
  );
}
