"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SeasonalPopularityProps {
  data: Record<string, {
    category: string;
    count: number;
  }[]>;
}

const seasonNames = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬"
};

export function SeasonalPopularity({ data }: SeasonalPopularityProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(data).map(([season, categories]) => (
        <Card key={season} className="p-4">
          <h4 className="font-semibold mb-4">{seasonNames[season as keyof typeof seasonNames]}</h4>
          <div className="space-y-3">
            {categories.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <Badge variant="outline">{item.category}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.count}回
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}