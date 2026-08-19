import { createDiagnostic, DiagnosticCollector } from "./vault-diagnostics.js";
import type {
  BookieCandidate,
  BookieData,
  BookieRecord,
  Manifest,
  Relation,
  SchemaValidators,
} from "./vault-model.js";

const inverseKinds = new Map<string, string>([
  ["relates_to", "relates_to"],
  ["blocks", "blocked_by"],
  ["blocked_by", "blocks"],
]);

function relationInverse(kind: string, sourceType: string): string | undefined {
  const direct = inverseKinds.get(kind);
  if (direct !== undefined) return direct;
  if (sourceType === "Decision" && kind === "supersedes") {
    return "superseded_by";
  }
  if (sourceType === "Decision" && kind === "superseded_by") {
    return "supersedes";
  }
  return undefined;
}

function asRelations(bookie: BookieData): readonly Relation[] {
  return bookie.relations ?? [];
}

export function validateCandidateIdentity(
  candidates: readonly BookieCandidate[],
  manifest: Manifest | undefined,
  validators: SchemaValidators,
  collector: DiagnosticCollector,
): void {
  const uids = new Set<string>();
  for (const candidate of candidates) {
    if (!validators.conceptPathPattern.test(candidate.path)) {
      collector.add(createDiagnostic("CONCEPT-PATH", candidate.displayFile));
    }
    if (
      manifest !== undefined &&
      candidate.profile !== undefined &&
      candidate.type !== undefined &&
      !manifest.allowed_concept_types.includes(candidate.type)
    ) {
      collector.add(createDiagnostic("TYPE-ALLOWED", candidate.displayFile));
    }
    if (candidate.uid !== undefined) {
      if (uids.has(candidate.uid)) {
        collector.add(createDiagnostic("UID-UNIQUE", candidate.displayFile));
      } else {
        uids.add(candidate.uid);
      }
    }
  }
}

export function validateCurrentTree(
  records: readonly BookieRecord[],
  collector: DiagnosticCollector,
): void {
  const byPath = new Map(records.map((record) => [record.path, record]));
  const incomingDecisionReplacements = new Map<string, number>();

  for (const source of records) {
    const projectPath = source.bookie.project;
    if (projectPath !== undefined) {
      const project = byPath.get(projectPath);
      if (project === undefined || project.type !== "Project") {
        collector.add(createDiagnostic("PROJECT-TARGET", source.displayFile));
      }
    }

    const seen = new Set<string>();
    for (const relation of asRelations(source.bookie)) {
      const logicalKey = `${relation.kind}\0${relation.target}`;
      if (seen.has(logicalKey)) {
        collector.add(createDiagnostic("RELATION-TARGET", source.displayFile));
      }
      seen.add(logicalKey);

      const target = byPath.get(relation.target);
      if (
        target === undefined ||
        (relation.target_uid !== undefined &&
          relation.target_uid !== target.bookie.uid)
      ) {
        collector.add(createDiagnostic("RELATION-TARGET", source.displayFile));
        continue;
      }

      if (relation.kind === "supersedes" || relation.kind === "superseded_by") {
        const correction =
          relation.kind === "supersedes" &&
          (source.type === "Activity" || source.type === "Evidence") &&
          target.type === source.type &&
          source.bookie.project === target.bookie.project;
        const decision =
          source.type === "Decision" && target.type === "Decision";
        if ((!correction && !decision) || target === source) {
          collector.add(
            createDiagnostic("RELATION-TARGET", source.displayFile),
          );
        }
      }

      const inverse = relationInverse(relation.kind, source.type);
      if (inverse !== undefined) {
        const matches = asRelations(target.bookie).filter(
          (candidate) =>
            candidate.kind === inverse &&
            candidate.target === source.path &&
            (candidate.target_uid === undefined ||
              candidate.target_uid === source.bookie.uid),
        );
        if (matches.length !== 1) {
          collector.add(
            createDiagnostic("RELATION-INVERSE", source.displayFile),
          );
        }
      }

      if (source.type === "Decision" && relation.kind === "supersedes") {
        incomingDecisionReplacements.set(
          target.path,
          (incomingDecisionReplacements.get(target.path) ?? 0) + 1,
        );
        const reciprocal = asRelations(target.bookie).filter(
          (candidate) =>
            candidate.kind === "superseded_by" &&
            candidate.target === source.path,
        );
        if (
          source.status !== "stable" ||
          source.bookie.state !== "accepted" ||
          target.type !== "Decision" ||
          target.bookie.project !== source.bookie.project ||
          target.status !== "deprecated" ||
          target.bookie.state !== "superseded" ||
          reciprocal.length !== 1
        ) {
          collector.add(
            createDiagnostic("DECISION-SUPERSESSION", source.displayFile),
          );
        }
      }
    }

    if (
      (source.type === "Activity" || source.type === "Evidence") &&
      asRelations(source.bookie).filter(
        (relation) => relation.kind === "supersedes",
      ).length > 1
    ) {
      collector.add(createDiagnostic("RELATION-TARGET", source.displayFile));
    }

    if (source.type === "Decision" && source.bookie.state === "superseded") {
      const links = asRelations(source.bookie).filter(
        (relation) => relation.kind === "superseded_by",
      );
      const replacement = byPath.get(links[0]?.target ?? "");
      const replacementEdges =
        replacement === undefined
          ? []
          : asRelations(replacement.bookie).filter(
              (relation) =>
                relation.kind === "supersedes" &&
                relation.target === source.path,
            );
      if (
        source.status !== "deprecated" ||
        links.length !== 1 ||
        replacement === undefined ||
        replacement.type !== "Decision" ||
        replacement.bookie.project !== source.bookie.project ||
        replacement.status !== "stable" ||
        replacement.bookie.state !== "accepted" ||
        replacementEdges.length !== 1
      ) {
        collector.add(
          createDiagnostic("DECISION-SUPERSESSION", source.displayFile),
        );
      }
    }

    if (source.type === "Evidence") {
      for (const support of source.bookie.supports ?? []) {
        if (!byPath.has(support)) {
          collector.add(
            createDiagnostic("EVIDENCE-SUPPORT", source.displayFile),
          );
        }
      }
    }
  }

  for (const [path, count] of incomingDecisionReplacements) {
    if (count > 1) {
      collector.add(
        createDiagnostic(
          "DECISION-SUPERSESSION",
          byPath.get(path)?.displayFile ?? "/bookie.yaml",
        ),
      );
    }
  }

  const decisionEdges = new Map<string, readonly string[]>(
    records
      .filter((record) => record.type === "Decision")
      .map((record) => [
        record.path,
        asRelations(record.bookie)
          .filter((relation) => relation.kind === "supersedes")
          .map((relation) => relation.target),
      ]),
  );
  const colors = new Map<string, 1 | 2>();
  const cyclicPaths = new Set<string>();
  for (const start of decisionEdges.keys()) {
    if (colors.has(start)) continue;
    const stack: Array<{
      readonly path: string;
      readonly targets: readonly string[];
      index: number;
    }> = [{ path: start, targets: decisionEdges.get(start) ?? [], index: 0 }];
    colors.set(start, 1);

    while (stack.length > 0) {
      const current = stack.at(-1);
      if (current === undefined) break;
      if (current.index >= current.targets.length) {
        colors.set(current.path, 2);
        stack.pop();
        continue;
      }
      const target = current.targets[current.index];
      current.index += 1;
      if (target === undefined || !decisionEdges.has(target)) continue;
      const color = colors.get(target);
      if (color === 1) {
        const cycleStart = stack.findIndex((entry) => entry.path === target);
        for (const entry of stack.slice(Math.max(0, cycleStart))) {
          cyclicPaths.add(entry.path);
        }
      } else if (color === undefined) {
        colors.set(target, 1);
        stack.push({
          path: target,
          targets: decisionEdges.get(target) ?? [],
          index: 0,
        });
      }
    }
  }
  for (const path of cyclicPaths) {
    collector.add(
      createDiagnostic(
        "DECISION-SUPERSESSION",
        byPath.get(path)?.displayFile ?? "/bookie.yaml",
      ),
    );
  }
}
