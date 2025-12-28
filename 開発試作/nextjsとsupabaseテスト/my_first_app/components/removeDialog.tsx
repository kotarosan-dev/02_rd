import { supabase } from "@/utils/supabase/supabase"
import { Dispatch, SetStateAction, ReactElement } from "react"
import getData from "./getData"

export default function RemoveDialog(props: {
  id: number,
  showModal: Dispatch<SetStateAction<boolean>>,
  taskList: Dispatch<SetStateAction<Array<ReactElement>>>
}) {
  const { showModal, taskList } = props;

  const onSubmit = async (event: any) => {
    event.preventDefault();
    showModal(false);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', props.id)
      if (error) {
        console.log(error);
      }

      await getData(taskList)
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full h-screen bg-black-rgba pt-28">
      <div className="m-auto relative p-4 w-full max-w-md max-h-full">
        <div className="relative bg-white rounded-lg shadow">
          <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t">
            <h3 className="text-xl font-semibold text-gray-900">
              タスクを削除します。よろしいですか？
            </h3>
            <button
              type="button"
              className="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
              data-modal-hide="authentication-modal"
              onClick={() => showModal(false)}
            >
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span className="sr-only">モーダルを閉じる</span>
            </button>
          </div>
          <div className="p-4 md:p-5">
            <div className="flex">
              <form className="w-1/2" onSubmit={onSubmit}>
                <button
                  type="submit"
                  className="w-full text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  タスクを削除
                </button>
              </form>
              <button
                className="ml-2 w-1/2 text-white bg-gray-400 hover:bg-gray-500 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                onClick={() => showModal(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
