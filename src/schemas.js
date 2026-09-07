export const implementationOutputSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["FINISHED", "BLOCKED"],
    },
    summary: { type: "string" },
    changes: {
      type: "array",
      items: { type: "string" },
    },
    tests: {
      type: "array",
      items: { type: "string" },
    },
    blockers: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["status", "summary", "changes", "tests", "blockers"],
  additionalProperties: false,
};

export const featurePlanOutputSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["READY", "BLOCKED"] },
    summary: { type: "string" },
    classification: {
      type: "string",
      enum: ["meaningful", "trivial", "backend_only"],
    },
    route: {
      type: "array",
      maxItems: 2,
      items: { type: "string", enum: ["mobile-design", "design_director"] },
    },
    routeSummary: { type: "string" },
    worthBuilding: { type: "string", enum: ["yes", "reduce", "no"] },
    worthReason: { type: "string" },
    reducedScope: { type: "array", maxItems: 5, items: { type: "string" } },
    userGoal: { type: "string" },
    behaviorDecisions: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    visualDirection: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
    implementationPlan: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
    implementationConstraints: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    outOfScope: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
    acceptanceChecks: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
    requiresScreenTest: { type: "boolean" },
    requiresDesignCheck: { type: "boolean" },
    requiresUxAudit: { type: "boolean" },
    requiresCodeReview: { type: "boolean" },
    blockers: { type: "array", items: { type: "string" } },
  },
  required: [
    "status",
    "summary",
    "worthBuilding",
    "worthReason",
    "classification",
    "route",
    "routeSummary",
    "userGoal",
    "behaviorDecisions",
    "visualDirection",
    "implementationPlan",
    "implementationConstraints",
    "outOfScope",
    "acceptanceChecks",
    "requiresScreenTest",
    "requiresDesignCheck",
    "requiresUxAudit",
    "requiresCodeReview",
    "blockers",
  ],
  additionalProperties: false,
};

export const auditorOutputSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["PASS", "CHANGES_REQUIRED", "BLOCKED"],
    },
    summary: { type: "string" },
    requiresRedesign: { type: "boolean" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          title: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["priority", "title", "evidence", "recommendation"],
        additionalProperties: false,
      },
    },
    checksPerformed: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "status",
    "summary",
    "requiresRedesign",
    "findings",
    "checksPerformed",
  ],
  additionalProperties: false,
};

export const testerOutputSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["PASS", "FAIL", "BLOCKED"],
    },
    summary: { type: "string" },
    findings: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          title: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["priority", "title", "evidence", "recommendation"],
        additionalProperties: false,
      },
    },
    observations: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    requestedSteps: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "tap",
              "tapText",
              "scrollToEnd",
              "text",
              "keyevent",
              "swipe",
              "wait",
              "checkpoint",
              "night",
              "hideKeyboard",
              "tree",
              "longPress",
            ],
          },
          value: { type: ["string", "number"] },
          name: { type: "string" },
          optional: { type: "boolean" },
          x: { type: "integer" },
          y: { type: "integer" },
          x1: { type: "integer" },
          y1: { type: "integer" },
          x2: { type: "integer" },
          y2: { type: "integer" },
          duration: { type: "integer" },
          ms: { type: "integer" },
          times: { type: "integer" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  required: ["status", "summary", "findings", "observations"],
  additionalProperties: false,
};

export const codeReviewerOutputSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["PASS", "CHANGES_REQUIRED", "BLOCKED"],
    },
    summary: { type: "string" },
    findings: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          title: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["priority", "title", "evidence", "recommendation"],
        additionalProperties: false,
      },
    },
    checksPerformed: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
  },
  required: ["status", "summary", "findings", "checksPerformed"],
  additionalProperties: false,
};

export const marketLaneOutputSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["COMPLETE", "BLOCKED"] },
    lane: { type: "string" },
    summary: { type: "string" },
    signals: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          quote: { type: "string" },
          meaning: { type: "string" },
          app: { type: "string" },
          source: { type: "string" },
          accessedAt: { type: "string" },
          strength: { type: "string", enum: ["recorrente", "isolado"] },
        },
        required: [
          "quote",
          "meaning",
          "app",
          "source",
          "accessedAt",
          "strength",
        ],
        additionalProperties: false,
      },
    },
    opportunities: { type: "array", maxItems: 5, items: { type: "string" } },
    risks: { type: "array", maxItems: 5, items: { type: "string" } },
    featureContext: { type: "array", maxItems: 5, items: { type: "string" } },
  },
  required: [
    "status",
    "lane",
    "summary",
    "signals",
    "opportunities",
    "risks",
    "featureContext",
  ],
  additionalProperties: false,
};
