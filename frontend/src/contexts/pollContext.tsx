import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";

type PollOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

type Question = {
  id: string;
  text: string;
  options: PollOption[];
  timer: number;
  status: "PENDING" | "ACTIVE" | "CLOSED";
  results?: {
    optionId: string;
    percentage: number;
    _count: number;
  }[];
};

type Participant = {
  id: string;
  username: string;
};

type PollRoom = {
  id: string;
  code: string;
  title: string;
  status: "ACTIVE" | "CLOSED";
  questions: Question[];
  participants: Participant[];
  history: Question[];
};

type PollContextType = {
  username: string;
  setUsername: (name: string) => void;
  role: "teacher" | "student" | null;
  pollRoom: PollRoom | null;
  createPollRoom: (title: string) => Promise<void>;
  joinPollRoom: (code: string) => Promise<void>;
  createQuestion: (
    text: string,
    options: string[],
    timer: number
  ) => Promise<void>;
  activateQuestion: (questionId: string) => Promise<void>;
  submitAnswer: (questionId: string, optionId: string) => Promise<void>;
  socket: Socket | null;
};

const PollContext = createContext<PollContextType | undefined>(undefined);

export function PollProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [pollRoom, setPollRoom] = useState<PollRoom | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("pollToken");
    if (token) {
      setAuthToken(token);
      initializeSocket(token);
    }
  }, []);

  const initializeSocket = (token: string) => {
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
    });

    newSocket.on("question-activated", (data: Question) => {
      setPollRoom((prev) =>
        prev
          ? {
              ...prev,
              activeQuestion: data,
              questions: prev.questions.map((q) =>
                q.id === data.id ? data : q
              ),
            }
          : null
      );
    });

    // newSocket.on(
    //   "answer-update",
    //   (data: { questionId: string; answerCount: number }) => {
    //     // Handle real-time answer updates if needed
    //   }
    // );

    newSocket.on(
      "question-results",
      (data: {
        questionId: string;
        results: Array<{
          optionId: string;
          percentage: number;
          _count: number;
        }>;
        correctOption: string | null;
      }) => {
        setPollRoom((prev) => {
          if (!prev) return null;

          // Find the question to update
          const updatedQuestion = prev.questions.find(
            (q) => q.id === data.questionId
          );
          if (!updatedQuestion) return prev;

          // Create updated question with results
          const questionWithResults = {
            ...updatedQuestion,
            status: "CLOSED" as const,
            results: data.results,
            options: updatedQuestion.options.map((opt) => ({
              ...opt,
              isCorrect: opt.id === data.correctOption,
            })),
          };

          const updatedQuestions = prev.questions.map((q) =>
            q.id === data.questionId ? questionWithResults : q
          );

          const isAlreadyInHistory = prev.history.some(
            (h) => h.id === data.questionId
          );
          const updatedHistory = isAlreadyInHistory
            ? prev.history.map((h) =>
                h.id === data.questionId ? questionWithResults : h
              )
            : [...prev.history, questionWithResults];

          return {
            ...prev,
            questions: updatedQuestions,
            history: updatedHistory,
          };
        });
      }
    );

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  };

  const createPollRoom = async (title: string) => {
    try {
      const response = await axios.post(
        "/api/poll",
        { title },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setPollRoom(response.data);
      setRole("teacher");
      socket?.emit("join-poll", response.data.code);
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  };

  // Join existing poll room
  const joinPollRoom = async (code: string) => {
    try {
      const response = await axios.post(
        "/api/poll/join",
        { code, username },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setPollRoom(response.data.poll);
      setRole("student");
      socket?.emit("join-poll", code);
    } catch (error) {
      console.error("Error joining poll:", error);
      throw error;
    }
  };

  // Create new question (Teacher only)
  const createQuestion = async (
    text: string,
    options: string[],
    timer: number
  ) => {
    if (!pollRoom || role !== "teacher") return;

    try {
      const response = await axios.post(
        `/api/poll/${pollRoom.code}/question`,
        { text, options, timer },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setPollRoom((prev) =>
        prev
          ? {
              ...prev,
              questions: [...prev.questions, response.data],
            }
          : null
      );
    } catch (error) {
      console.error("Error creating question:", error);
      throw error;
    }
  };

  // Activate question (Teacher only)
  const activateQuestion = async (questionId: string) => {
    if (!pollRoom || role !== "teacher") return;

    try {
      await axios.post(
        `/api/poll/${pollRoom.code}/question/${questionId}/activate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error activating question:", error);
      throw error;
    }
  };

  // Submit answer (Student only)
  const submitAnswer = async (questionId: string, optionId: string) => {
    if (!pollRoom || role !== "student") return;

    try {
      await axios.post(
        `/api/poll/${pollRoom.code}/question/${questionId}/answer`,
        { optionId },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw error;
    }
  };

  return (
    <PollContext.Provider
      value={{
        username,
        setUsername,
        role,
        pollRoom,
        createPollRoom,
        joinPollRoom,
        createQuestion,
        activateQuestion,
        submitAnswer,
        socket,
      }}
    >
      {children}
    </PollContext.Provider>
  );
}

export function usePoll() {
  const context = useContext(PollContext);
  if (context === undefined) {
    throw new Error("usePoll must be used within a PollProvider");
  }
  return context;
}
