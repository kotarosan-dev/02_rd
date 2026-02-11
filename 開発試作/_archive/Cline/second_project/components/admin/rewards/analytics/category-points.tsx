"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CategoryPointsProps {
  earnedByCategory: {
    category: string;
    points: number;
  }[];
  usedByCategory: {
    category: string;
    points: number;
  }[];
}

export function CategoryPoints({ earnedByCategory, usedByCategory }: CategoryPointsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">カテゴリー別獲得ポイント</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>カテゴリー</TableHead>
              <TableHead className="text-right">獲得ポイント</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earnedByCategory.map((category) => (
              <TableRow key={category.category}>
                <TableCell>
                  <Badge variant="outline">{category.category}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {category.points.toLocaleString()} pt
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">カテゴリー別使用ポイント</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>カテゴリー</TableHead>
              <TableHead className="text-right">使用ポイント</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usedByCategory.map((category) => (
              <TableRow key={category.category}>
                <TableCell>
                  <Badge variant="outline">{category.category}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {category.points.toLocaleString()} pt
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}