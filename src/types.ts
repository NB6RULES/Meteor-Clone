export type Task = {
  text: string;
  done: boolean;
};

export type Note = {
  id: string;
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
  liveActivityId: string | null;
};
