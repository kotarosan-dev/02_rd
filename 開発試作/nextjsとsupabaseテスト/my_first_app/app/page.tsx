import TaskTable from "@/components/taskTable";

export default async function Index() {

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center pt-24">
      <TaskTable></TaskTable>
    </div>
  )
}
