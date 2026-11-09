import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { loadAdhkarDB } from "@/data/load";
import { useNoorStore } from "@/store/noorStore";
import { getAccountStorageOwner } from "@/lib/accountStorageScope";

export function useAdhkarDB() {
  const owner = getAccountStorageOwner();
  const query = useQuery({
    queryKey: ["adhkar-db", owner],
    queryFn: () => loadAdhkarDB(owner),
  });
  const migrateDhikrItemState = useNoorStore((state) => state.migrateDhikrItemState);
  const customPacks = useNoorStore((state) => state.customPacks);

  React.useLayoutEffect(() => {
    for (const pack of customPacks) {
      const customItems = pack.items.flatMap((item, index) =>
        item.id ? [{ index, itemId: item.id }] : [],
      );
      if (customItems.length) migrateDhikrItemState(pack.id, customItems);
    }
    for (const section of query.data?.db.sections ?? []) {
      const customItems = section.content.flatMap((item, index) =>
        item.id ? [{ index, itemId: item.id }] : [],
      );
      if (customItems.length) migrateDhikrItemState(section.id, customItems);
    }
  }, [customPacks, migrateDhikrItemState, query.data]);

  return query;
}
