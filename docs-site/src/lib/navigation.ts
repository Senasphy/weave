export interface NavSubItem {
  title: string;
  href: string;
}

export interface NavItem {
  title: string;
  href: string;
  subItems?: NavSubItem[];
  defaultOpen?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "Get Started",
    items: [
      { title: "Overview", href: "/" },
      { title: "Quickstart", href: "/getting-started" },
      { title: "Architecture", href: "/getting-started#architecture" },
      {
        title: "Example Workflows",
        href: "/getting-started#quickstart",
        subItems: [
          { title: "Customer Support Triage", href: "/#workflow-anatomy" },
          { title: "Lead Enrichment Pipeline", href: "/getting-started#step-2-run" },
          { title: "Research & Summarization", href: "/concepts#workflow-graphs" },
        ],
      },
    ],
  },
  {
    title: "Foundations",
    items: [
      {
        title: "Workflow Concepts",
        href: "/concepts",
        defaultOpen: true,
        subItems: [
          { title: "Workflow Basics", href: "/concepts#workflow-graphs" },
          { title: "The 4 Step Types", href: "/concepts#node-types" },
          { title: "Connecting Steps", href: "/concepts#edge-routing" },
        ],
      },
      {
        title: "State & Data",
        href: "/concepts#state-reducers",
        subItems: [
          { title: "Schemas & Validation", href: "/concepts#schemas" },
          { title: "Shared State", href: "/concepts#state-reducers" },
          { title: "Passing Data", href: "/concepts#handoffs" },
        ],
      },
      {
        title: "Budgets & Safety",
        href: "/concepts#budgets",
        subItems: [
          { title: "Spending & Token Caps", href: "/concepts#budgets" },
          { title: "Cost Tracking", href: "/concepts#cost" },
        ],
      },
    ],
  },
  {
    title: "Engine & Runtime",
    items: [
      {
        title: "Execution Model",
        href: "/engine",
        subItems: [
          { title: "How Steps Run", href: "/engine#execution-semantics" },
          { title: "Background Workers", href: "/engine#worker-loop" },
        ],
      },
      {
        title: "Progress & Resilience",
        href: "/engine#event-sourcing",
        subItems: [
          { title: "Step Progress Logging", href: "/engine#event-sourcing" },
          { title: "Crash Recovery", href: "/engine#crash-recovery" },
        ],
      },
      {
        title: "Human Approvals",
        href: "/engine#human-gates",
        defaultOpen: true,
        subItems: [
          { title: "Approval Setup", href: "/engine#human-gates" },
          { title: "Resolution Options", href: "/engine#human-gates" },
          { title: "Timeout Policies", href: "/engine#human-gates" },
        ],
      },
      { title: "Condition Expressions (CEL)", href: "/engine#cel-expressions" },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "CLI Tool", href: "/cli" },
      { title: "Visual Editor", href: "/visual-editor" },
      { title: "Deployment & Docker", href: "/deployment" },
    ],
  },
  {
    title: "API Reference",
    items: [
      {
        title: "Workflows & Runs",
        href: "/api-reference",
        defaultOpen: true,
        subItems: [
          { title: "List Workflows", href: "/api-reference#workflows" },
          { title: "Create Workflow", href: "/api-reference#workflows" },
          { title: "Drafts & Versions", href: "/api-reference#drafts-versions" },
          { title: "Execute Run", href: "/api-reference#runs" },
          { title: "Live Event Stream (SSE)", href: "/api-reference#sse-streaming" },
          { title: "Resolve Approvals", href: "/api-reference#gates" },
        ],
      },
    ],
  },
];

export const secondaryNavDropdowns = [
  {
    title: "Foundations",
    items: [
      { title: "Workflow Basics", href: "/concepts" },
      { title: "The 4 Step Types", href: "/concepts#node-types" },
      { title: "Shared State", href: "/concepts#state-reducers" },
      { title: "Spending Limits", href: "/concepts#budgets" },
    ],
  },
  {
    title: "Engine",
    items: [
      { title: "Execution Runtime", href: "/engine" },
      { title: "Progress Logging & Recovery", href: "/engine#event-sourcing" },
      { title: "Human Approvals", href: "/engine#human-gates" },
      { title: "Condition Expressions", href: "/engine#cel-expressions" },
    ],
  },
  {
    title: "References",
    items: [
      { title: "OpenAPI Specification", href: "/api-reference" },
      { title: "SSE Real-Time Stream", href: "/api-reference#sse-streaming" },
      { title: "CLI Command Matrix", href: "/cli" },
      { title: "Visual Editor Guide", href: "/visual-editor" },
    ],
  },
  {
    title: "CLI & Tools",
    items: [
      { title: "weave run", href: "/cli#run" },
      { title: "weave validate", href: "/cli#validate" },
      { title: "weave serve", href: "/cli#serve" },
      { title: "weave worker", href: "/cli#worker" },
    ],
  },
  {
    title: "API",
    items: [
      { title: "REST Endpoints", href: "/api-reference" },
      { title: "SSE Live Streams", href: "/api-reference#sse-streaming" },
      { title: "Gate Approvals", href: "/api-reference#gates" },
      { title: "Error Matrix", href: "/api-reference#errors" },
    ],
  },
];

export const headerLinks = [
  { title: "Docs", href: "/" },
  { title: "API", href: "/api-reference" },
  { title: "Engine", href: "/engine" },
  { title: "Guides", href: "/getting-started" },
];

export const searchItems = [
  { title: "Overview", section: "Get Started", href: "/" },
  { title: "Quickstart", section: "Get Started", href: "/getting-started" },
  { title: "Architecture", section: "Get Started", href: "/getting-started#architecture" },
  { title: "Workflow Graphs", section: "Foundations", href: "/concepts#workflow-graphs" },
  { title: "Node Types", section: "Foundations", href: "/concepts#node-types" },
  { title: "State & Reducers", section: "Foundations", href: "/concepts#state-reducers" },
  { title: "Budgets", section: "Foundations", href: "/concepts#budgets" },
  { title: "Execution Semantics", section: "Engine", href: "/engine#execution-semantics" },
  { title: "Event Sourcing", section: "Engine", href: "/engine#event-sourcing" },
  { title: "Human Review Gates", section: "Engine", href: "/engine#human-gates" },
  { title: "CEL Expressions", section: "Engine", href: "/engine#cel-expressions" },
  { title: "Replay", section: "Engine", href: "/engine#replay" },
  { title: "REST API", section: "Reference", href: "/api-reference" },
  { title: "SSE Streaming", section: "Reference", href: "/api-reference#sse-streaming" },
  { title: "CLI Commands", section: "Reference", href: "/cli" },
  { title: "Visual Editor", section: "Reference", href: "/visual-editor" },
  { title: "Deployment", section: "Reference", href: "/deployment" },
];
