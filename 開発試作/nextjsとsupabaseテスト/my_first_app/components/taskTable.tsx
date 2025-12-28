"use client"
import AddTask from "./addTask"
import { ReactElement, useState, useEffect } from "react"
import getData from "./getData"

export default function TaskTable() {
  const [taskList, setTaskList] = useState<Array<ReactElement>>([])

  // 初回のみ実行したいので、第二引数が空のuseEffectでデータ取得
  useEffect(() => {
    getData(setTaskList)
  }, [])

  return (
    <div className="sm:w-full md:w-1/2 lg:w-1/2 xl:w-1/3 max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-800">Todoリスト</h1>
        <AddTask taskList={setTaskList}></AddTask>
        <ul className="mt-4 divide-y divide-gray-200">
          {taskList}
        </ul>
      </div>
    </div>
  )
}
