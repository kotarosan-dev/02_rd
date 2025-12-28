"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { GoalCard } from "@/components/goal-card"
import { GoalDialog } from "@/components/goal-dialog"
import { useToast } from "@/hooks/use-toast"

interface Goal {
  id: string
  title: string
  description: string
  status: "not_started" | "in_progress" | "completed"
}

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const { toast } = useToast()

  const handleCreateGoal = (data: { title: string; description: string }) => {
    const newGoal: Goal = {
      id: Math.random().toString(36).substring(7),
      title: data.title,
      description: data.description,
      status: "not_started",
    }
    setGoals((prev) => [...prev, newGoal])
    toast({
      title: "目標を作成しました",
      description: data.title,
    })
  }

  const handleEditGoal = (data: { title: string; description: string }) => {
    if (!editingGoal) return
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === editingGoal.id
          ? { ...goal, title: data.title, description: data.description }
          : goal
      )
    )
    setEditingGoal(null)
    toast({
      title: "目標を更新しました",
      description: data.title,
    })
  }

  const handleDeleteGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId))
    toast({
      title: "目標を削除しました",
      variant: "destructive",
    })
  }

  const handleStatusChange = (goalId: string, newStatus: Goal["status"]) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId ? { ...goal, status: newStatus } : goal
      )
    )
    toast({
      title: "ステータスを更新しました",
    })
  }

  const filteredGoals = (status: Goal["status"]) =>
    goals.filter((goal) => goal.status === status)

  return (
    <main className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">目標管理</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新しい目標
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 未着手の目標 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              未着手
              <span className="ml-2 text-sm text-muted-foreground">
                ({filteredGoals("not_started").length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredGoals("not_started").map((goal) => (
              <GoalCard
                key={goal.id}
                title={goal.title}
                description={goal.description}
                status={goal.status}
                onEdit={() => {
                  setEditingGoal(goal)
                  setDialogOpen(true)
                }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onStatusChange={(status) => handleStatusChange(goal.id, status)}
              />
            ))}
          </CardContent>
        </Card>

        {/* 進行中の目標 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              進行中
              <span className="ml-2 text-sm text-muted-foreground">
                ({filteredGoals("in_progress").length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredGoals("in_progress").map((goal) => (
              <GoalCard
                key={goal.id}
                title={goal.title}
                description={goal.description}
                status={goal.status}
                onEdit={() => {
                  setEditingGoal(goal)
                  setDialogOpen(true)
                }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onStatusChange={(status) => handleStatusChange(goal.id, status)}
              />
            ))}
          </CardContent>
        </Card>

        {/* 達成済みの目標 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              達成済み
              <span className="ml-2 text-sm text-muted-foreground">
                ({filteredGoals("completed").length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredGoals("completed").map((goal) => (
              <GoalCard
                key={goal.id}
                title={goal.title}
                description={goal.description}
                status={goal.status}
                onEdit={() => {
                  setEditingGoal(goal)
                  setDialogOpen(true)
                }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onStatusChange={(status) => handleStatusChange(goal.id, status)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingGoal(null)
        }}
        initialData={
          editingGoal
            ? {
                title: editingGoal.title,
                description: editingGoal.description,
              }
            : undefined
        }
        onSubmit={editingGoal ? handleEditGoal : handleCreateGoal}
      />
    </main>
  )
}
