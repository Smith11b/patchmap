export type LookupFile = {
  id: string;
  filePath: string;
  oldFilePath?: string | null;
  changeType: "added" | "modified" | "deleted" | "renamed";
  fileExtension?: string | null;
  topLevelDir?: string | null;
  displayOrder: number;
};

export type SuggestedPatchMapGroup = {
  key: string;
  title: string;
  description: string;
  orderIndex: number;
  fileIds: string[];
};

type GroupDefinition = {
  key: string;
  title: string;
  description: string;
  orderIndex: number;
  matchers: Array<(file: LookupFile, normalizedPath: string) => boolean>;
};

function includesAny(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => path.includes(pattern));
}

function filename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function isTestFile(path: string): boolean {
  const name = filename(path).toLowerCase();

  return (
    includesAny(path, ["/test/", "/tests/", "/__tests__/", "/spec/", "/specs/"]) ||
    name.endsWith(".test.ts") ||
    name.endsWith(".test.tsx") ||
    name.endsWith(".test.js") ||
    name.endsWith(".test.jsx") ||
    name.endsWith(".spec.ts") ||
    name.endsWith(".spec.tsx") ||
    name.endsWith(".spec.js") ||
    name.endsWith(".spec.jsx") ||
    name.endsWith("test.java") ||
    name.endsWith("tests.java")
  );
}

const GROUP_DEFINITIONS: GroupDefinition[] = [
  {
    key: "api-controller",
    title: "API / Controller",
    description: "HTTP endpoints, controllers, routes, and request entrypoints.",
    orderIndex: 0,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/controller/",
          "/controllers/",
          "/route/",
          "/routes/",
          "/api/",
          "/endpoint/",
          "/endpoints/",
          "/resolver/",
          "/resolvers/",
        ]),
      (_file, path) => {
        const name = filename(path);
        return (
          name.includes("Controller.") ||
          name.includes("Route.") ||
          name.includes("Resolver.")
        );
      },
    ],
  },
  {
    key: "ui-routes-pages",
    title: "UI Screens / Routes",
    description: "Pages, route-level UI, and screen entrypoints.",
    orderIndex: 1,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/pages/",
          "/page/",
          "/routes/",
          "/route/",
          "/screens/",
          "/screen/",
          "/views/",
          "/view/",
          "/app/",
        ]),
      (_file, path) => {
        const name = filename(path).toLowerCase();
        return (
          name === "page.tsx" ||
          name === "page.ts" ||
          name === "route.ts" ||
          name === "route.tsx"
        );
      },
    ],
  },
  {
    key: "ui-components",
    title: "UI Components",
    description: "Reusable visual components and presentational UI.",
    orderIndex: 2,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/component/",
          "/components/",
          "/ui/",
          "/widgets/",
        ]),
      (file, path) =>
        (file.fileExtension === "tsx" || file.fileExtension === "jsx") &&
        includesAny(path, ["/component", "/components", "/ui", "/widget", "/widgets"]),
    ],
  },
  {
    key: "hooks-state",
    title: "Hooks / State",
    description: "Hooks, stores, reducers, and client-side state management.",
    orderIndex: 3,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/hook/",
          "/hooks/",
          "/store/",
          "/stores/",
          "/state/",
          "/redux/",
          "/zustand/",
          "/reducer/",
          "/reducers/",
          "/context/",
        ]),
      (_file, path) => filename(path).startsWith("use"),
    ],
  },
  {
    key: "service-logic",
    title: "Service Logic",
    description: "Core business logic, use cases, handlers, and orchestration.",
    orderIndex: 4,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/service/",
          "/services/",
          "/usecase/",
          "/usecases/",
          "/use-case/",
          "/use-cases/",
          "/handler/",
          "/handlers/",
          "/domain/",
          "/domains/",
          "/application/",
          "/orchestration/",
          "/workflow/",
          "/workflows/",
        ]),
      (_file, path) => {
        const name = filename(path);
        return (
          name.includes("Service.") ||
          name.includes("Handler.") ||
          name.includes("UseCase.") ||
          name.includes("Usecase.")
        );
      },
    ],
  },
  {
    key: "helpers-utils",
    title: "Helpers / Utilities",
    description: "Helpers, utilities, mappers, and shared supporting logic.",
    orderIndex: 5,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/helper/",
          "/helpers/",
          "/util/",
          "/utils/",
          "/mapper/",
          "/mappers/",
          "/lib/",
          "/shared/",
          "/common/",
        ]),
      (_file, path) => {
        const name = filename(path);
        return (
          name.includes("Util.") ||
          name.includes("Utils.") ||
          name.includes("Helper.") ||
          name.includes("Mapper.")
        );
      },
    ],
  },
  {
    key: "persistence-data",
    title: "Persistence / Data",
    description: "Repositories, entities, models, DAO layers, and data access.",
    orderIndex: 6,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/repo/",
          "/repos/",
          "/repository/",
          "/repositories/",
          "/dao/",
          "/daos/",
          "/entity/",
          "/entities/",
          "/model/",
          "/models/",
          "/persistence/",
          "/database/",
          "/db/",
        ]),
      (_file, path) => {
        const name = filename(path);
        return (
          name.includes("Repository.") ||
          name.includes("Entity.") ||
          name.includes("Model.") ||
          name.includes("Dao.")
        );
      },
    ],
  },
  {
    key: "contracts-types",
    title: "Contracts / Types",
    description: "DTOs, request/response models, schemas, and type definitions.",
    orderIndex: 7,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/dto/",
          "/dtos/",
          "/schema/",
          "/schemas/",
          "/type/",
          "/types/",
          "/contract/",
          "/contracts/",
          "/request/",
          "/requests/",
          "/response/",
          "/responses/",
        ]),
      (_file, path) => {
        const name = filename(path).toLowerCase();
        return (
          name.includes("request.") ||
          name.includes("response.") ||
          name.includes("dto.") ||
          name.includes("schema.") ||
          name.endsWith(".d.ts")
        );
      },
    ],
  },
  {
    key: "tests",
    title: "Tests",
    description: "Automated tests validating the behavior of the change.",
    orderIndex: 8,
    matchers: [(_file, path) => isTestFile(path)],
  },
  {
    key: "config-infra",
    title: "Config / Infrastructure",
    description: "Configuration, pipelines, manifests, and deployment concerns.",
    orderIndex: 9,
    matchers: [
      (_file, path) =>
        includesAny(path, [
          "/config/",
          "/configs/",
          "/infra/",
          "/infrastructure/",
          ".github/",
          ".gitlab/",
          "/k8s/",
          "/helm/",
          "/terraform/",
          "/docker/",
        ]),
      (_file, path) => {
        const name = filename(path).toLowerCase();
        return (
          name === "application.yml" ||
          name === "application.yaml" ||
          name === "dockerfile" ||
          name === "package.json" ||
          name === "tsconfig.json"
        );
      },
    ],
  },
];

function normalizePath(filePath: string): string {
  return `/${filePath.toLowerCase().replaceAll("\\", "/")}`;
}

function classifyFile(file: LookupFile): GroupDefinition {
  const path = normalizePath(file.filePath);

  for (const def of GROUP_DEFINITIONS) {
    if (def.matchers.some((matcher) => matcher(file, path))) {
      return def;
    }
  }

  return {
    key: "other",
    title: "Other",
    description: "Files that do not cleanly fit a more specific change category.",
    orderIndex: 99,
    matchers: [],
  };
}

export function autoGroupFiles(
  files: LookupFile[]
): SuggestedPatchMapGroup[] {
  const sortedFiles = [...files].sort((a, b) => a.displayOrder - b.displayOrder);

  const groupMap = new Map<string, SuggestedPatchMapGroup>();

  for (const file of sortedFiles) {
    const def = classifyFile(file);

    const existing = groupMap.get(def.key);
    if (existing) {
      existing.fileIds.push(file.id);
      continue;
    }

    groupMap.set(def.key, {
      key: def.key,
      title: def.title,
      description: def.description,
      orderIndex: def.orderIndex,
      fileIds: [file.id],
    });
  }

  return Array.from(groupMap.values()).sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    return a.title.localeCompare(b.title);
  });
}
