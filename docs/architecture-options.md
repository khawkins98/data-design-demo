# Architecture options

UNDRR is not choosing only a component library. It is choosing an operating
model: either two product stacks connected by a maintained bridge (Types A and
B), or a coordinated family of UNDRR-owned systems sharing foundations (Type C).
All candidates cover the tested screens. The decision is who owns the component
expression, how changes propagate, and where synchronization can fail.

## What UNDRR is choosing

Any candidate can sit behind a UNDRR wrapper. The question is whether shared
UNDRR foundations become the enduring product layer or remain an adapter around
an upstream library.

## Three shapes, not five

### A. Ship-and-theme — MUI, Mantine, Ant Design

Two parallel paths use the same token mechanism but different component stacks:
Mangrove for content products and a themed suite for DELTA.

```mermaid
flowchart LR
  T["UNDRR, DELTA or project-specific<br/>design tokens"]:::input
  L["MUI / Mantine / Ant Design<br/>components + conventions"]:::upstream
  W["Project theme + wrappers"]:::integration
  D["DELTA application stack"]:::product
  M["Mangrove component stack"]:::integration
  C["UNDRR content products"]:::product
  B["Maintained translation bridge"]:::risk

  T -->|"theme values"| L
  L -->|"suite structure"| W
  W --> D
  T -->|"theme values"| M
  M --> C
  L -.->|"selected components"| B
  B -.->|"host repair"| M
  D <-.->|"possible reuse?<br/>synchronisation risk"| C

  classDef input fill:#e9f3fb,stroke:#527fa4,color:#102a43,stroke-width:1.5px
  classDef upstream fill:#f0edfb,stroke:#7562ad,color:#2d2547,stroke-width:1.5px
  classDef integration fill:#dcecf8,stroke:#2871a9,color:#102a43,stroke-width:1.75px
  classDef product fill:#ffffff,stroke:#82919d,color:#1f2933,stroke-width:1.25px
  classDef risk fill:#fff2dc,stroke:#a55d00,color:#603600,stroke-width:2px,stroke-dasharray:5 4
  linkStyle 5,6,7 stroke:#a55d00,stroke-width:2px,stroke-dasharray:5 4
```

**What you get.** Upstream-maintained components and behaviour for DELTA, while
content products continue to inherit Mangrove.

**What it costs.** The two paths do not become one system merely because both are
token-driven. Moving a component or policy between them requires a maintained
translation bridge, creating the main synchronization risk.

### B. Complete branded system — IBM Carbon

Structurally the same as A, but Carbon also brings IBM's design language.

```mermaid
flowchart LR
  T["UNDRR or project-specific<br/>design tokens"]:::input
  L["Carbon components<br/>+ IBM design language"]:::upstream
  B["Carbon-to-Mangrove<br/>adapter"]:::risk
  M["Mangrove component stack"]:::integration
  W["Project Carbon theme<br/>+ wrappers"]:::integration
  C["UNDRR content applications"]:::product
  D["DELTA data application"]:::product

  T -->|"UNDRR visual language"| M
  M --> C
  T -->|"supported Carbon theming<br/>incomplete token coverage"| W
  L -->|"components + conventions"| W
  W --> D
  L -.->|"selected components"| B
  B -.->|"host integration"| M
  M -.->|"optional Mangrove mix-in"| D

  classDef input fill:#e9f3fb,stroke:#527fa4,color:#102a43,stroke-width:1.5px
  classDef upstream fill:#f0edfb,stroke:#7562ad,color:#2d2547,stroke-width:1.5px
  classDef integration fill:#dcecf8,stroke:#2871a9,color:#102a43,stroke-width:1.75px
  classDef risk fill:#fff2dc,stroke:#a55d00,color:#603600,stroke-width:2px,stroke-dasharray:5 4
  classDef product fill:#ffffff,stroke:#82919d,color:#1f2933,stroke-width:1.25px
  linkStyle 5,6,7 stroke:#a55d00,stroke-width:2px,stroke-dasharray:5 4
```

Carbon supports direct token mapping, but roughly 30% of the evaluated UNDRR
tokens were unreachable and IBM defaults still shape the result. Cross-stack
reuse therefore needs translation and does not naturally create one system.

### C. Foundational — Adobe React Aria

React Aria ships behaviour and semantics, not appearance. There is no theme layer
to configure because there is nothing to theme.

```mermaid
flowchart LR
  subgraph S["Shared UNDRR design-system family"]
    direction LR
    T["UNDRR or project-specific<br/>design tokens"]:::input
    RA["React Aria foundation<br/>behaviour + accessible primitives"]:::owned
    M["Mangrove<br/>content-system half"]:::flavor
    DS["UNDRR data<br/>design-system half"]:::flavor

    T --> RA
    T --> M
    RA --> M
    RA --> DS
    M <-->|"direct component reuse"| DS
  end

  C["UNDRR content sites"]:::product
  D["DELTA + data applications"]:::product

  M --> C
  DS --> D
  DS -.->|"can plug in"| C
  M -.->|"can plug in"| D

  classDef input fill:#e9f3fb,stroke:#527fa4,color:#102a43,stroke-width:1.5px
  classDef owned fill:#cfe6f6,stroke:#004f91,color:#0b263a,stroke-width:2.5px,font-weight:bold
  classDef flavor fill:#e8f2f9,stroke:#2871a9,color:#102a43,stroke-width:1.75px
  classDef product fill:#ffffff,stroke:#82919d,color:#1f2933,stroke-width:1.25px
  style S fill:#f5f9fc,stroke:#7fa6c3,stroke-width:1.5px
  linkStyle 4 stroke:#004f91,stroke-width:2.5px
  linkStyle 7,8 stroke:#2871a9,stroke-width:2px,stroke-dasharray:6 4
```

There is no upstream visual system to bridge or repair. “React Aria foundation”
means UNDRR's styled integration around the headless library. Tokens, accessible
primitives and behaviour can be governed together.

Mangrove and the data design system become two halves of one governed family.
Each keeps its product flavour, but components can move directly between them or
plug into either product family.

The diagrams now hold reuse intent constant while allowing different operating
models. Under A and B, shared packages configure and repair component systems
whose structure and design language remain upstream. Under C, UNDRR governs one
design-system family with a shared React Aria foundation and two deliberately
different product-facing halves.

## What Type C requires

Type C is *fund a design system*, not *save implementation work*. The pilot must
establish:

1. **A funded owner** for the shared foundation and both product-facing halves.
2. **Human accessibility validation** for critical journeys.
3. **A governed release and backlog model** so fixes propagate across the family.

The experiment proves that a substantial React Aria foundation can be packaged
across both hosts. It does not prove the complete component family or fund its
ongoing operation.

## The reuse and ownership result

React Aria and MUI both produced a substantial package consumed by two hosts.
The generated developer evidence below retains the exact measurements; the
architectural difference is who owns component structure and change propagation.

## What this does not settle

The pilot still needs human accessibility validation, a named operating owner,
and second-product reuse. If Type A is chosen instead, MUI's documented RTL setup
must become part of the delivery standard.
