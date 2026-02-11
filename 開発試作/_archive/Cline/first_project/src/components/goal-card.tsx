"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

interface GoalCardProps {
  title: string
  description: string
  status: "not_started" | "in_progress" | "completed"
  onEdit?: () => void
  onDelete?: () => void
  onStatusChange?: (status: "not_started" | "in_progress" | "completed") => void
}

export function GoalCard({
  title,
  description,
  status,
  onEdit,
  onDelete,
  onStatusChange,
}: GoalCardProps) {
  return (
    <Card className="animate-in">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">メニューを開く</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {status !== "not_started" && (
                <DropdownMenuItem onClick={() => onStatusChange?.("not_started")}>
                  未着手に移動
                </DropdownMenuItem>
              )}
              {status !== "in_progress" && (
                <DropdownMenuItem onClick={() => onStatusChange?.("in_progress")}>
                  進行中に移動
                </DropdownMenuItem>
              )}
              {status !== "completed" && (
                <DropdownMenuItem onClick={() => onStatusChange?.("completed")}>
                  達成済みに移動
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicators or additional details can be added here */}
      </CardContent>
      <CardFooter className="pt-0">
        {/* Additional actions or information can be added here */}
      </CardFooter>
    </Card>
  )
}
