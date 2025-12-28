import { supabase } from "@/utils/supabase/supabase"
import Task from "./task"
import { Dispatch, SetStateAction, ReactElement } from "react"

export default async function getData(
  taskList: Dispatch<SetStateAction<Array<ReactElement>>>
) {
  const tmpTaskList = []
  try {
    let { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
    if (error) {
      console.log(error)
    }

    if (tasks != null) {
      for (let index = 0; index < tasks.length; index++) {
        tmpTaskList.push(<li className="flex items-center justify-between py-2" key={tasks[index]["id"]}>
          <Task taskList={taskList} id={tasks[index]["id"]} text={tasks[index]["text"] ?? ""} update_at={tasks[index]["update_at"] ?? ""}></Task>
        </li>)
      }
      taskList(tmpTaskList)
    }
  } catch (error) {
    console.log(error);
  }
}
