import type { ReactNode } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/Badge";
import { useAuth } from "@/auth/AuthContext";
import { APP_NAME } from "@/config";

/**
 * In-app documentation: a short, step-by-step tutorial covering every feature
 * for internal Bitnob staff. Content only — no data fetching — so it works for
 * any signed-in user. Admin-only actions are tagged so staff know what they'll
 * see.
 *
 * Spacing model: every GuideSection body lays its blocks out with `space-y-lg`
 * so lists, tables and callouts always keep an even 24px of breathing room —
 * nothing sits flush against the block after it.
 */

interface Section {
  id: string;
  title: string;
  icon: string;
  adminOnly?: boolean;
}

const SECTIONS: Section[] = [
  { id: "sign-in", title: "Signing in", icon: "login" },
  { id: "getting-around", title: "Getting around", icon: "explore" },
  { id: "inventory", title: "Browsing inventory", icon: "inventory_2" },
  { id: "product-details", title: "Product details & units", icon: "qr_code_2" },
  { id: "ask-ai", title: "Ask AI", icon: "auto_awesome" },
  { id: "add-edit", title: "Adding & editing products", icon: "add_box", adminOnly: true },
  { id: "categories", title: "Categories", icon: "category" },
  { id: "reports", title: "Reports & export", icon: "analytics" },
  { id: "users", title: "Managing users", icon: "group", adminOnly: true },
  { id: "notifications", title: "Notifications", icon: "notifications" },
  { id: "settings", title: "Settings & password", icon: "settings" },
];

export function GuidePage() {
  const { openNav } = useLayout();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <>
      <Topbar title="Documentation (User's Guide)" onOpenNav={openNav} />

      <main className="mx-auto w-full max-w-4xl space-y-xl p-md md:p-lg">
        {/* Intro */}
        <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div className="flex flex-col gap-md p-lg md:flex-row md:items-center md:gap-lg md:p-xl">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
              <Icon name="menu_book" className="text-[26px]" />
            </span>
            <div className="min-w-0">
              <h1 className="text-headline-sm font-bold text-on-surface">
                How to use {APP_NAME}
              </h1>
              <p className="mt-sm text-body-md leading-relaxed text-on-surface-variant">
                {APP_NAME} is Bitnob&apos;s internal tool for tracking office hardware — every
                laptop, monitor, cable and peripheral, down to its serial number. This guide walks
                through each feature step by step. You&apos;re signed in as{" "}
                <Badge tone={isAdmin ? "info" : "neutral"}>{user?.role ?? "staff"}</Badge>.
              </p>
            </div>
          </div>
        </section>

        {/* One-minute mental model */}
        <Callout icon="lightbulb" tone="info" title="One idea that explains everything">
          Every physical unit is tracked on its own, identified by a unique{" "}
          <strong>serial number</strong> — that serial is the unit&apos;s product ID. So five
          identical laptops are five tracked units. A &ldquo;product&rdquo; in the list is just all
          the units of the same brand and model grouped together.
        </Callout>

        {/* Contents */}
        <nav
          aria-label="Guide contents"
          className="rounded-lg border border-outline-variant bg-surface-container-low p-lg md:p-xl"
        >
          <h2 className="mb-lg text-label-caps uppercase tracking-wider text-on-surface-variant">
            Contents
          </h2>
          <ol className="grid grid-cols-1 gap-x-xl gap-y-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group flex items-center gap-sm rounded-md px-2 py-2 text-body-md text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-variant text-body-sm font-semibold text-on-surface-variant group-hover:text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 truncate">{s.title}</span>
                  {s.adminOnly && <Badge tone="info">Admin</Badge>}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1. Signing in */}
        <GuideSection section={SECTIONS[0]}>
          <Steps>
            <Step n={1}>
              Open {APP_NAME} and enter the <strong>email and password</strong> your administrator
              gave you, then choose <strong>Sign in</strong>.
            </Step>
            <Step n={2}>
              Don&apos;t have an account? Accounts are created by an administrator — ask an admin on
              your team to add you. There&apos;s no self-service reset either: if you forget your
              password, an admin can set a new one for you.
            </Step>
            <Step n={3}>
              After signing in you land on the <strong>Inventory</strong> dashboard. To sign out,
              open the <strong>account menu</strong> (your initials, top-right) and choose{" "}
              <strong>Log out</strong>.
            </Step>
          </Steps>
        </GuideSection>

        {/* 2. Getting around */}
        <GuideSection section={SECTIONS[1]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            The <strong>sidebar</strong> on the left is your main menu. The <strong>top bar</strong>{" "}
            holds search and account controls on every page.
          </p>
          <DefinitionList
            items={[
              ["Inventory", "The main dashboard — every product and its stock."],
              ["Categories", "Group products by type (Peripherals, Storage, …)."],
              ["Reports", "Totals, stock health and CSV export."],
              ["Settings", "Your preferences and password."],
              ["Users", "Manage accounts — visible to admins only."],
            ]}
          />
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            In the top bar you&apos;ll also find <strong>Ask AI</strong>, the{" "}
            <strong>notifications bell</strong>, and your <strong>account menu</strong>. On a phone,
            tap the <Icon name="menu" className="align-middle text-[18px]" /> menu icon to open the
            sidebar.
          </p>
        </GuideSection>

        {/* 3. Browsing inventory */}
        <GuideSection section={SECTIONS[2]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            The dashboard opens with five summary cards — <strong>Products</strong>,{" "}
            <strong>Total Units</strong>, <strong>Total Value</strong>, <strong>Low Stock</strong>{" "}
            and <strong>Out of Stock</strong> — followed by the product list.
          </p>
          <Steps>
            <Step n={1}>
              <strong>Search</strong> the list by typing a brand, serial number or category into the
              search box.
            </Step>
            <Step n={2}>
              <strong>Filter</strong> using the <strong>Category</strong> and <strong>Status</strong>{" "}
              dropdowns to narrow what&apos;s shown.
            </Step>
            <Step n={3}>
              Read each product&apos;s <strong>status</strong> at a glance:
              <span className="mt-sm flex flex-wrap gap-sm">
                <Badge tone="success">In Stock</Badge>
                <Badge tone="warning">Low Stock</Badge>
                <Badge tone="danger">Out of Stock</Badge>
              </span>
            </Step>
          </Steps>
          <Callout icon="tune" tone="neutral" title="What counts as “low”?">
            A product is <strong>Low Stock</strong> when its unit count drops to your low-stock
            threshold or below, and <strong>Out of Stock</strong> at zero units. You set that
            threshold on the <strong>Settings</strong> page.
          </Callout>
        </GuideSection>

        {/* 4. Product details & units */}
        <GuideSection section={SECTIONS[3]}>
          <Steps>
            <Step n={1}>
              <strong>Click any product</strong> in the list to open its details panel.
            </Step>
            <Step n={2}>
              At the top you&apos;ll see a rollup — <strong>total units</strong>,{" "}
              <strong>unit price</strong>, <strong>total value</strong> and when it was last updated.
            </Step>
            <Step n={3}>
              Below that is the <strong>Units</strong> list: every physical unit with its own{" "}
              <strong>serial number</strong> and price. This is where you confirm exactly which
              units you hold.
            </Step>
          </Steps>
        </GuideSection>

        {/* 5. Ask AI */}
        <GuideSection section={SECTIONS[4]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            <strong>Ask AI</strong> lets you ask questions about your inventory in plain English,
            instead of setting filters by hand.
          </p>
          <Steps>
            <Step n={1}>
              Select <strong>Ask AI</strong> in the top bar to open the question box.
            </Step>
            <Step n={2}>
              Type a question and choose <strong>Ask</strong>. You&apos;ll get a short answer plus a
              list of matching products you can click straight through to.
            </Step>
            <Step n={3}>
              Try questions like:
              <ExampleList
                items={[
                  "How many keyboards do we have?",
                  "Which products are low on stock?",
                  "Show me everything in Storage.",
                  "What's the total value of our peripherals?",
                ]}
              />
            </Step>
          </Steps>
          <Callout icon="info" tone="neutral" title="Tip">
            Ask AI is best for quick questions and discovery. For precise, repeatable filtering, the
            Category and Status dropdowns on the Inventory page are still the fastest tool.
          </Callout>
        </GuideSection>

        {/* 6. Adding & editing products (admin) */}
        <GuideSection section={SECTIONS[5]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Adding, editing and deleting inventory is available to <strong>administrators</strong>.
            Staff can browse and search everything but won&apos;t see these controls.
          </p>

          <div className="space-y-md">
            <SubHeading>Add a product</SubHeading>
            <Steps>
              <Step n={1}>
                On the Inventory page, choose <strong>Add Product</strong>.
              </Step>
              <Step n={2}>
                Fill in the shared details once: <strong>Brand</strong> (required),{" "}
                <strong>Model No.</strong>, <strong>Category</strong>, <strong>Unit Price</strong>{" "}
                and an optional <strong>Description</strong> and image.
              </Step>
              <Step n={3}>
                Enter a <strong>serial number for each unit</strong>. Use{" "}
                <strong>Add another unit</strong> for more rows — or paste a whole list of serials at
                once (one per line, or comma-separated) and they&apos;ll split into separate units.
              </Step>
              <Step n={4}>
                Choose <strong>Save</strong>. Each serial becomes its own tracked unit. If any serial
                is already in use, {APP_NAME} tells you exactly which ones so you can fix them.
              </Step>
            </Steps>
          </div>

          <div className="space-y-md">
            <SubHeading>Add more units or edit later</SubHeading>
            <Steps>
              <Step n={1}>
                Open a product&apos;s details and choose <strong>Add Units</strong> to add more of
                the same product.
              </Step>
              <Step n={2}>
                Use the <Icon name="edit" className="align-middle text-[18px]" /> edit or{" "}
                <Icon name="delete" className="align-middle text-[18px]" /> delete icon next to any
                unit to change its details or remove it.
              </Step>
            </Steps>
          </div>
        </GuideSection>

        {/* 7. Categories */}
        <GuideSection section={SECTIONS[6]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            The <strong>Categories</strong> page shows each category with its product count, unit
            count, <strong>stock health</strong> and total value. Click a row to jump to the
            inventory filtered to that category.
          </p>
          <Steps admin>
            <Step n={1}>
              <strong>Add Category</strong> stages a new name so it&apos;s selectable when adding
              products; it becomes permanent once a product uses it.
            </Step>
            <Step n={2}>
              <strong>Rename</strong> (<Icon name="edit" className="align-middle text-[18px]" />) a
              category and it updates every product carrying it.
            </Step>
            <Step n={3}>
              <strong>Delete</strong> (<Icon name="delete" className="align-middle text-[18px]" />)
              is only available for unused categories — reassign a category&apos;s products before it
              can be removed.
            </Step>
          </Steps>
        </GuideSection>

        {/* 8. Reports */}
        <GuideSection section={SECTIONS[7]}>
          <Steps>
            <Step n={1}>
              Open <strong>Reports</strong> for the big picture: product count, unit count, total
              value and how many products need restocking.
            </Step>
            <Step n={2}>
              Use the <strong>Period</strong> dropdown to focus on units added in the last 30 or 90
              days, or all time.
            </Step>
            <Step n={3}>
              Review <strong>Stock Health</strong>, <strong>Top Categories by Value</strong> and{" "}
              <strong>Most Valuable Products</strong> to see how inventory is distributed.
            </Step>
            <Step n={4}>
              Choose <strong>Export CSV</strong> to download the current view — one row per unit,
              with serial numbers — for spreadsheets or record-keeping.
            </Step>
          </Steps>
        </GuideSection>

        {/* 9. Users (admin) */}
        <GuideSection section={SECTIONS[8]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            The <strong>Users</strong> page is for <strong>administrators</strong> only. Every new
            account starts as <strong>staff</strong>.
          </p>
          <Steps admin>
            <Step n={1}>
              Choose <strong>Add User</strong>, enter their email and a temporary password —{" "}
              <strong>Generate</strong> makes a strong one and <strong>Copy</strong> puts it on your
              clipboard to share securely.
            </Step>
            <Step n={2}>
              Use <strong>Make admin</strong> / <strong>Revoke admin</strong> to change someone&apos;s
              role. Granting admin asks for confirmation, since admins can manage inventory and other
              users. You can&apos;t revoke your own admin access.
            </Step>
            <Step n={3}>
              <strong>Reset password</strong> sets a new password for a user who&apos;s been locked
              out or forgotten theirs.
            </Step>
            <Step n={4}>
              <strong>Search</strong> by email or filter by <strong>role</strong> to find someone
              quickly.
            </Step>
          </Steps>
        </GuideSection>

        {/* 10. Notifications */}
        <GuideSection section={SECTIONS[9]}>
          <Steps>
            <Step n={1}>
              The <Icon name="notifications" className="align-middle text-[18px]" /> bell in the top
              bar flags <strong>inventory changes</strong> — when a unit is added, edited or removed.
              A red dot shows unread alerts.
            </Step>
            <Step n={2}>
              Open the bell to read recent changes, then <strong>Mark read</strong> or{" "}
              <strong>Clear</strong> them.
            </Step>
            <Step n={3}>
              Turn alerts on or off any time under <strong>Settings → Notifications</strong>.
            </Step>
          </Steps>
        </GuideSection>

        {/* 11. Settings & password */}
        <GuideSection section={SECTIONS[10]}>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            <strong>Settings</strong> is where you tune {APP_NAME} to how you work.
          </p>
          <DefinitionList
            items={[
              ["Low stock threshold", "The unit count at or below which a product is “Low Stock”."],
              ["Rows per page", "How many items each list shows before paging."],
              ["Notifications", "Turn inventory-change alerts on or off."],
              ["Security", "Change your password — current password required."],
              ["Reset preferences", "Restore the default settings."],
            ]}
          />
          <Callout icon="lock" tone="neutral" title="Changing your password">
            Under <strong>Security</strong>, enter your current password, then your new one twice
            (at least 8 characters), and choose <strong>Change password</strong>.
          </Callout>
        </GuideSection>

        {/* Footer */}
        <p className="pt-sm text-center text-body-sm text-on-surface-variant">
          Still stuck? Ask an administrator on your team — {APP_NAME} is an internal Bitnob tool.
        </p>
      </main>
    </>
  );
}

/* ------------------------------- building blocks ------------------------------ */

function GuideSection({ section, children }: { section: Section; children: ReactNode }) {
  return (
    <section
      id={section.id}
      // scroll-mt keeps the heading clear of the sticky top bar when jumped to.
      className="scroll-mt-24 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
    >
      <header className="flex items-center gap-md border-b border-outline-variant px-lg py-md md:px-xl">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-variant text-primary">
          <Icon name={section.icon} className="text-[22px]" />
        </span>
        <h2 className="flex flex-wrap items-center gap-sm text-body-md font-bold text-on-surface">
          {section.title}
          {section.adminOnly && <Badge tone="info">Admin only</Badge>}
        </h2>
      </header>
      {/* space-y-lg is the spacing model: every block keeps 24px of air. */}
      <div className="space-y-lg px-lg py-lg md:px-xl md:py-xl">{children}</div>
    </section>
  );
}

function Steps({ children, admin }: { children: ReactNode; admin?: boolean }) {
  return (
    <div className="space-y-md">
      {admin && <Badge tone="info">Admin only</Badge>}
      <ol className="space-y-md">{children}</ol>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-md">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-body-sm font-bold text-on-primary-container">
        {n}
      </span>
      <div className="pt-1 text-body-md leading-relaxed text-on-surface">{children}</div>
    </li>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-label-caps uppercase tracking-wider text-on-surface-variant">{children}</h3>
  );
}

function DefinitionList({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
      {items.map(([term, desc]) => (
        <div key={term} className="flex flex-col gap-0.5 px-md py-md sm:flex-row sm:gap-md">
          <dt className="font-semibold text-on-surface sm:w-48 sm:flex-shrink-0">{term}</dt>
          <dd className="text-body-md text-on-surface-variant">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExampleList({ items }: { items: string[] }) {
  return (
    <ul className="mt-md space-y-sm">
      {items.map((q) => (
        <li key={q} className="flex items-start gap-sm text-body-md text-on-surface-variant">
          <Icon name="chat_bubble" className="mt-0.5 text-[16px] text-primary" />
          <span className="italic">&ldquo;{q}&rdquo;</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({
  icon,
  tone,
  title,
  children,
}: {
  icon: string;
  tone: "info" | "neutral";
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className={
        tone === "info"
          ? "flex gap-md rounded-lg border border-primary-container bg-primary-fixed/30 p-lg md:p-xl"
          : "flex gap-md rounded-lg border border-outline-variant bg-surface-container-low p-lg md:p-xl"
      }
    >
      <Icon name={icon} className="mt-0.5 flex-shrink-0 text-[22px] text-primary" />
      <div className="min-w-0">
        <p className="font-semibold text-on-surface">{title}</p>
        <p className="mt-sm text-body-md leading-relaxed text-on-surface-variant">{children}</p>
      </div>
    </section>
  );
}
