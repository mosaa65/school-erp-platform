"use client";

import type { EntitySurfaceDefinition } from "@/presentation/entity-surface/entity-surface-types";

const entitySurfaceRegistry = new Map<string, EntitySurfaceDefinition<unknown>>();

export function defineEntitySurface<TRecord>(
  definition: EntitySurfaceDefinition<TRecord>,
): EntitySurfaceDefinition<TRecord> {
  return definition;
}

export function registerEntitySurface<TRecord>(
  definition: EntitySurfaceDefinition<TRecord>,
): EntitySurfaceDefinition<TRecord> {
  entitySurfaceRegistry.set(definition.entityKey, definition as EntitySurfaceDefinition<unknown>);
  return definition;
}

export function getEntitySurfaceDefinition<TRecord>(
  entityKey: string,
): EntitySurfaceDefinition<TRecord> | undefined {
  return entitySurfaceRegistry.get(entityKey) as EntitySurfaceDefinition<TRecord> | undefined;
}

export function listEntitySurfaceDefinitions(): EntitySurfaceDefinition<unknown>[] {
  return Array.from(entitySurfaceRegistry.values());
}
