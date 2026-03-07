import type { LookupCatalogListItem } from "@/lib/api/client";

export type GeographyCatalogData = {
  governorates: LookupCatalogListItem[];
  directorates: LookupCatalogListItem[];
  subDistricts: LookupCatalogListItem[];
  villages: LookupCatalogListItem[];
  localities: LookupCatalogListItem[];
};

export type GeographyMaps = {
  governorateById: Map<number, LookupCatalogListItem>;
  directorateById: Map<number, LookupCatalogListItem>;
  subDistrictById: Map<number, LookupCatalogListItem>;
  villageById: Map<number, LookupCatalogListItem>;
  localityById: Map<number, LookupCatalogListItem>;
};

type LocalityLike = {
  id: number;
  nameAr?: string;
  name?: string;
  localityType?: "RURAL" | "URBAN";
  directorateId?: number | null;
  villageId?: number | null;
};

export type GeographySelection = {
  governorateId: string;
  directorateId: string;
  subDistrictId: string;
  villageId: string;
};

export const EMPTY_GEOGRAPHY_DATA: GeographyCatalogData = {
  governorates: [],
  directorates: [],
  subDistricts: [],
  villages: [],
  localities: [],
};

function getDisplayName(
  item: Pick<LookupCatalogListItem, "id" | "nameAr" | "name"> | undefined,
  fallbackLabel: string,
): string {
  if (!item) {
    return fallbackLabel;
  }

  return item.nameAr ?? item.name ?? fallbackLabel;
}

function translateLocalityType(localityType?: "RURAL" | "URBAN"): string {
  if (localityType === "URBAN") {
    return "حضري";
  }

  return "ريفي";
}

export function buildGeographyMaps(data: GeographyCatalogData): GeographyMaps {
  return {
    governorateById: new Map(data.governorates.map((item) => [item.id, item])),
    directorateById: new Map(data.directorates.map((item) => [item.id, item])),
    subDistrictById: new Map(data.subDistricts.map((item) => [item.id, item])),
    villageById: new Map(data.villages.map((item) => [item.id, item])),
    localityById: new Map(data.localities.map((item) => [item.id, item])),
  };
}

export function resolveSelectionFromLocality(
  locality: LocalityLike | undefined,
  maps: GeographyMaps,
): GeographySelection {
  if (!locality) {
    return {
      governorateId: "",
      directorateId: "",
      subDistrictId: "",
      villageId: "",
    };
  }

  if (locality.localityType === "URBAN" && locality.directorateId) {
    const directorate = maps.directorateById.get(locality.directorateId);
    return {
      governorateId: directorate?.governorateId ? String(directorate.governorateId) : "",
      directorateId: String(locality.directorateId),
      subDistrictId: "",
      villageId: "",
    };
  }

  if (locality.villageId) {
    const village = maps.villageById.get(locality.villageId);
    const subDistrict = village?.subDistrictId
      ? maps.subDistrictById.get(village.subDistrictId)
      : undefined;
    const directorate = subDistrict?.directorateId
      ? maps.directorateById.get(subDistrict.directorateId)
      : undefined;

    return {
      governorateId: directorate?.governorateId ? String(directorate.governorateId) : "",
      directorateId: subDistrict?.directorateId ? String(subDistrict.directorateId) : "",
      subDistrictId: village?.subDistrictId ? String(village.subDistrictId) : "",
      villageId: String(locality.villageId),
    };
  }

  return {
    governorateId: "",
    directorateId: "",
    subDistrictId: "",
    villageId: "",
  };
}

export function formatLocalityHierarchyLabel(
  locality: LocalityLike,
  maps: GeographyMaps,
): string {
  const localityName = locality.nameAr ?? locality.name ?? `محلة #${locality.id}`;
  const localityType = translateLocalityType(locality.localityType);

  if (locality.localityType === "URBAN" && locality.directorateId) {
    const directorate = maps.directorateById.get(locality.directorateId);
    const governorate = directorate?.governorateId
      ? maps.governorateById.get(directorate.governorateId)
      : undefined;

    return [
      localityName,
      getDisplayName(directorate, ""),
      getDisplayName(governorate, ""),
      localityType,
    ]
      .filter((part) => part.length > 0)
      .join(" - ");
  }

  if (locality.villageId) {
    const village = maps.villageById.get(locality.villageId);
    const subDistrict = village?.subDistrictId
      ? maps.subDistrictById.get(village.subDistrictId)
      : undefined;
    const directorate = subDistrict?.directorateId
      ? maps.directorateById.get(subDistrict.directorateId)
      : undefined;
    const governorate = directorate?.governorateId
      ? maps.governorateById.get(directorate.governorateId)
      : undefined;

    return [
      localityName,
      getDisplayName(village, ""),
      getDisplayName(subDistrict, ""),
      getDisplayName(directorate, ""),
      getDisplayName(governorate, ""),
      localityType,
    ]
      .filter((part) => part.length > 0)
      .join(" - ");
  }

  return `${localityName} (${localityType})`;
}
